import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const boat = vi.hoisted(() => ({
  boatConfigured: vi.fn(() => true),
  listManagedBoats: vi.fn(async () => ({ configured: true, available: true, problem: null, instances: [] })),
  deleteManagedBoat: vi.fn(async () => undefined),
}));

vi.mock("./boat.ts", async (importOriginal) => {
  const original = await importOriginal<typeof import("./boat.ts")>();
  return { ...original, ...boat };
});

const { createCloudComputerPurge, registryMatchesOwners } = await import("./cloud-computer-purge.ts");

const registryFile = (contents: string) => {
  const file = join(mkdtempSync(join(tmpdir(), "omb-purge-")), "bots.json");
  writeFileSync(file, contents);
  return file;
};

describe("the reclaim sweep when the registry did not load", () => {
  it("does nothing, because every box would look orphaned", async () => {
    const log: string[] = [];
    const purge = createCloudComputerPurge({
      cfg: {} as never,
      owners: () => [],
      botsFile: registryFile(JSON.stringify([{ id: "bot_still_listed" }])),
      log: (line) => log.push(line),
    });
    expect(await purge.sweep()).toBe(0);
    expect(boat.listManagedBoats).not.toHaveBeenCalled();
    expect(log.join(" ")).toContain("no box can be proven orphaned");
  });

  it("reads a corrupt registry as unproven rather than empty", () => {
    expect(registryMatchesOwners([], registryFile("{not json"))).toBe(false);
  });

  it("matches when every bot in the file is one the running store knows", () => {
    const owners = [{ botId: "bot_a", name: "A", inUse: false }, { botId: "bot_b", name: "B", inUse: false }];
    expect(registryMatchesOwners(owners, registryFile(JSON.stringify([{ id: "bot_a" }, { id: "bot_b" }])))).toBe(true);
  });

  it("refuses when the file lists a bot the running store never loaded", () => {
    const owners = [{ botId: "bot_a", name: "A", inUse: false }];
    expect(registryMatchesOwners(owners, registryFile(JSON.stringify([{ id: "bot_a" }, { id: "bot_b" }])))).toBe(false);
  });
});
