// Reclaims cloud computers this installation created that no bot owns any more. The power manager puts an idle computer
// to sleep; nothing brings back the orphans left behind when a bot is deleted, and Boat bills storage for them even asleep.
// A box is deleted only after it has been seen orphaned and asleep for a full grace window, and every delete is a fresh
// read that refuses one which became owned or in use meanwhile.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "./atomic.ts";
import * as boat from "./boat.ts";
import { DATA_DIR, type AppConfig } from "./config.ts";
import { redactSecretsInText } from "./redact.ts";

export const BOAT_PURGE_STATE_FILE = join(DATA_DIR, "cloud-computer-purge.json");
const BOTS_FILE = join(DATA_DIR, "bots.json");
/** A box unowned for this long has finished with its work; shorter risks deleting one a person still means to use. */
export const CLOUD_COMPUTER_PURGE_GRACE_MS = (() => {
  const days = Number(process.env.OMB_CLOUD_COMPUTER_PURGE_DAYS ?? 7);
  return Number.isFinite(days) && days > 0 ? days * 24 * 60 * 60_000 : 7 * 24 * 60 * 60_000;
})();
/** Hourly is often enough to notice an orphan, and cheap: one listing, usually with nothing to do. */
export const CLOUD_COMPUTER_PURGE_EVERY_MS = 60 * 60_000;
const MAX_LISTING_RETRY_MS = 6 * 60 * 60_000;

export interface BoatPurgeCandidate {
  boxId: string;
  name: string;
  state: string;
  orphaned: boolean;
  inUse: boolean;
}

export type BoatPurgeKeepReason = "owned" | "in-use" | "awake" | "removing" | "young";

export interface BoatPurgePlan {
  remove: Array<{ boxId: string; name: string }>;
  keep: Array<{ boxId: string; reason: BoatPurgeKeepReason }>;
  /** The clock to persist: first time each box was seen orphaned and asleep, cleared for boxes that come back. */
  seen: Record<string, number>;
}

/**
 * Decide, without touching the network, which boxes may go. `seen` is the persisted first-sighting clock.
 * Awake boxes are never candidates: the power manager sleeps an idle one within its window, so awake means recently used.
 */
export function planBoatPurge(
  instances: readonly BoatPurgeCandidate[],
  opts: { now: number; seen: Readonly<Record<string, number>>; graceMs?: number },
): BoatPurgePlan {
  const graceMs = opts.graceMs ?? CLOUD_COMPUTER_PURGE_GRACE_MS;
  const seen: Record<string, number> = {};
  const remove: BoatPurgePlan["remove"] = [];
  const keep: BoatPurgePlan["keep"] = [];
  for (const instance of instances) {
    if (!instance.orphaned) { keep.push({ boxId: instance.boxId, reason: "owned" }); continue; }
    if (instance.inUse) { keep.push({ boxId: instance.boxId, reason: "in-use" }); continue; }
    if (instance.state === "removing") { keep.push({ boxId: instance.boxId, reason: "removing" }); continue; }
    if (!boat.SLEEPING_BOAT_STATES.has(instance.state)) { keep.push({ boxId: instance.boxId, reason: "awake" }); continue; }
    const firstSeen = opts.seen[instance.boxId];
    if (firstSeen === undefined) {
      seen[instance.boxId] = opts.now;
      keep.push({ boxId: instance.boxId, reason: "young" });
      continue;
    }
    seen[instance.boxId] = firstSeen;
    if (opts.now - firstSeen < graceMs) { keep.push({ boxId: instance.boxId, reason: "young" }); continue; }
    remove.push({ boxId: instance.boxId, name: instance.name });
  }
  return { remove, keep, seen };
}

export interface CloudComputerPurgeDeps {
  cfg: AppConfig;
  owners(): boat.ManagedBoatOwner[];
  log(line: string): void;
  /** Where the bot registry lives; tests point it at a fixture. */
  botsFile?: string;
}

/** The running store holds no bots either because there are none or because bots.json did not load. A sweep may only
 * proceed in the first case: otherwise every managed box looks orphaned. Re-read the registry and require every bot it
 * lists to be one the running store knows, so a repaired file cannot hide a store that started without it. */
export function registryMatchesOwners(owners: readonly boat.ManagedBoatOwner[], file = BOTS_FILE): boolean {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(parsed)) return false;
    const known = new Set(owners.map((owner) => owner.botId));
    return parsed.every((bot) => {
      const id = (bot as { id?: unknown } | null)?.id;
      return typeof id === "string" && known.has(id);
    });
  } catch {
    return false;
  }
}

function readSeen(): Record<string, number> {
  try {
    const parsed = JSON.parse(readFileSync(BOAT_PURGE_STATE_FILE, "utf8")) as { seen?: unknown };
    const seen = parsed?.seen;
    if (!seen || typeof seen !== "object" || Array.isArray(seen)) return {};
    return Object.fromEntries(Object.entries(seen).filter((entry): entry is [string, number] =>
      typeof entry[1] === "number" && Number.isFinite(entry[1])));
  } catch {
    return {};
  }
}

export function createCloudComputerPurge(deps: CloudComputerPurgeDeps) {
  const { cfg } = deps;
  let seen = readSeen();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let retryInMs = CLOUD_COMPUTER_PURGE_EVERY_MS;
  let closed = false;

  const saveSeen = () => {
    try {
      writeFileAtomic(BOAT_PURGE_STATE_FILE, `${JSON.stringify({ version: 1, seen }, null, 2)}\n`, { mode: 0o600 });
    } catch (error) {
      deps.log(`cloud computers: could not save the purge clock: ${redactSecretsInText(error instanceof Error ? error.message : String(error))}`);
    }
  };

  async function sweep(): Promise<number> {
    if (closed || !boat.boatConfigured(cfg)) return 0;
    const owners = deps.owners();
    if (!registryMatchesOwners(owners, deps.botsFile)) {
      deps.log("cloud computers: not reclaiming any this hour, because bots.json does not match the running bot list and no box can be proven orphaned");
      return 0;
    }
    const inventory = await boat.listManagedBoats(cfg, owners, { adoptLegacy: false }).catch(() => null);
    if (closed) return 0;
    if (!inventory?.available) {
      deps.log(`cloud computers: could not list them to reclaim unused ones, retrying in ${Math.ceil(retryInMs / 60_000)} min: ${redactSecretsInText(inventory?.problem ?? "listing failed")}`);
      retryInMs = Math.min(retryInMs * 2, MAX_LISTING_RETRY_MS);
      return 0;
    }
    retryInMs = CLOUD_COMPUTER_PURGE_EVERY_MS;
    const plan = planBoatPurge(inventory.instances, { now: Date.now(), seen });
    seen = plan.seen;
    saveSeen();
    let purged = 0;
    for (const target of plan.remove) {
      if (closed) break;
      try {
        // The claim runs on the fresh listing inside deleteManagedBoat, after every await: a box adopted or
        // woken in between refuses here instead of being destroyed.
        await boat.deleteManagedBoat(cfg, deps.owners(), target.boxId, target.name, (current) => {
          if (!current.orphaned) {
            throw Object.assign(new Error("this cloud computer now belongs to a bot"), { status: 409 });
          }
          if (current.inUse) {
            throw Object.assign(new Error("this cloud computer is in use"), { status: 409 });
          }
        });
        delete seen[target.boxId];
        purged += 1;
        deps.log(`cloud computer ${target.name}: reclaimed after ${Math.round(CLOUD_COMPUTER_PURGE_GRACE_MS / 86_400_000)} days unused`);
      } catch (error) {
        const reason = redactSecretsInText(error instanceof Error ? error.message : String(error));
        deps.log(`cloud computer ${target.name}: not reclaimed: ${reason}`);
      }
    }
    if (purged) saveSeen();
    return purged;
  }

  /** One sweep now, then on an hourly cadence that never keeps the process alive. */
  function start(): void {
    const tick = async () => {
      await sweep().catch(() => 0);
      if (closed) return;
      timer = setTimeout(() => void tick(), retryInMs);
      timer.unref?.();
    };
    timer = setTimeout(() => void tick(), CLOUD_COMPUTER_PURGE_EVERY_MS);
    timer.unref?.();
  }

  return {
    sweep,
    start,
    close(): void {
      closed = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
