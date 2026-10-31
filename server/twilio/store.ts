// The installation's one Twilio integration, on disk in the data directory.
//
// One file, one record: two integrations cannot be written without deleting the
// first, which is what makes "global" a property of the storage rather than a
// promise the UI keeps. The auth token lives here and nowhere else; every read
// that leaves this module goes through `publicIntegration`.
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";

import { writeFileAtomic } from "../atomic.ts";

const stored = z.object({
  version: z.literal(1),
  accountSid: z.string().min(1).max(64),
  accountName: z.string().max(200),
  authToken: z.string().min(1).max(200),
  fromNumber: z.string().min(1).max(24),
  toNumber: z.string().min(1).max(24),
  botId: z.string().min(1).max(120),
  linkedAt: z.number(),
  updatedAt: z.number(),
  firstMessageAt: z.number().nullable(),
  lastError: z.string().max(500).nullable(),
  /** MessageSids already handed to the bot: a Twilio retry must not answer twice. */
  seen: z.array(z.string().max(64)).max(500),
}).strict();

export type StoredIntegration = z.infer<typeof stored>;

/** What the settings screen and the status line may see. */
export type PublicIntegration = Omit<StoredIntegration, "authToken" | "seen" | "version">;

const MAX_SEEN = 200;

const file = (dataDir: string) => join(dataDir, "sms.json");

export function readIntegration(dataDir: string): StoredIntegration | null {
  try {
    const parsed = stored.safeParse(JSON.parse(readFileSync(file(dataDir), "utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    // A missing file is the normal first run; an unreadable one is treated the
    // same way, so a corrupt record asks the person to connect again rather
    // than leaving the app unable to start.
    return null;
  }
}

export function writeIntegration(dataDir: string, value: StoredIntegration): void {
  mkdirSync(dirname(file(dataDir)), { recursive: true });
  writeFileAtomic(file(dataDir), `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

export function clearIntegration(dataDir: string): void {
  rmSync(file(dataDir), { force: true });
}

export function publicIntegration(value: StoredIntegration | null): PublicIntegration | null {
  if (!value) return null;
  const { authToken: _token, seen: _seen, version: _version, ...rest } = value;
  return rest;
}

/** Records a SID as handled and keeps only the newest handful. */
export function rememberSeen(value: StoredIntegration, sid: string): StoredIntegration {
  if (value.seen.includes(sid)) return value;
  return { ...value, seen: [...value.seen, sid].slice(-MAX_SEEN) };
}

export function hasSeen(value: StoredIntegration, sid: string): boolean {
  return value.seen.includes(sid);
}
