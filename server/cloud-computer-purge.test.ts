import { describe, expect, it } from "vitest";
import { planBoatPurge, type BoatPurgeCandidate } from "./cloud-computer-purge.ts";

const HOUR = 60 * 60_000;
const GRACE = 7 * 24 * HOUR;
const NOW = 1_800_000_000_000;

const box = (overrides: Partial<BoatPurgeCandidate> = {}): BoatPurgeCandidate => ({
  boxId: "bx_0123456789",
  name: "omb-bot-012345-abcdef",
  state: "archived",
  orphaned: true,
  inUse: false,
  ...overrides,
});

describe("which unused cloud computers may be reclaimed", () => {
  it("keeps a box the first time it is seen, so a restart never deletes on sight", () => {
    const plan = planBoatPurge([box()], { now: NOW, seen: {} });
    expect(plan.remove).toEqual([]);
    expect(plan.keep).toEqual([{ boxId: "bx_0123456789", reason: "young" }]);
    expect(plan.seen["bx_0123456789"]).toBe(NOW);
  });

  it("removes it once it has been unused for the whole window", () => {
    const plan = planBoatPurge([box()], { now: NOW, seen: { bx_0123456789: NOW - GRACE } });
    expect(plan.remove).toEqual([{ boxId: "bx_0123456789", name: "omb-bot-012345-abcdef" }]);
    expect(plan.keep).toEqual([]);
  });

  it("waits out the rest of the window", () => {
    const plan = planBoatPurge([box()], { now: NOW, seen: { bx_0123456789: NOW - GRACE + HOUR } });
    expect(plan.remove).toEqual([]);
    expect(plan.seen["bx_0123456789"]).toBe(NOW - GRACE + HOUR);
  });

  it("never touches a box a bot owns, and drops its clock", () => {
    const plan = planBoatPurge([box({ orphaned: false })], { now: NOW, seen: { bx_0123456789: NOW - GRACE } });
    expect(plan.remove).toEqual([]);
    expect(plan.keep).toEqual([{ boxId: "bx_0123456789", reason: "owned" }]);
    expect(plan.seen).toEqual({});
  });

  it("never touches one in use", () => {
    const plan = planBoatPurge([box({ inUse: true })], { now: NOW, seen: { bx_0123456789: NOW - GRACE } });
    expect(plan.remove).toEqual([]);
    expect(plan.keep[0]?.reason).toBe("in-use");
  });

  it("leaves an awake box alone: sleep is what proves it unused", () => {
    const plan = planBoatPurge([box({ state: "ready" })], { now: NOW, seen: { bx_0123456789: NOW - GRACE } });
    expect(plan.remove).toEqual([]);
    expect(plan.keep[0]?.reason).toBe("awake");
    expect(plan.seen).toEqual({});
  });

  it("leaves a box already being removed alone", () => {
    const plan = planBoatPurge([box({ state: "removing" })], { now: NOW, seen: { bx_0123456789: NOW - GRACE } });
    expect(plan.remove).toEqual([]);
    expect(plan.keep[0]?.reason).toBe("removing");
  });

  it("forgets boxes that no longer exist", () => {
    const plan = planBoatPurge([], { now: NOW, seen: { bx_gone: NOW - GRACE } });
    expect(plan.seen).toEqual({});
  });
});
