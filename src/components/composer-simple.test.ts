// The composer's busy copy is the only place a chosen Steer mode can be explained. These are the pure functions
// the composer renders, so the fallback is pinned without mounting a whole thread.
import { beforeAll, describe, expect, it } from "vitest";
import { setLocale } from "@/lib/i18n";
import { composerPlaceholder, sendLabels, steerInterruptsTurn } from "./composer-simple";

beforeAll(() => setLocale("en"));

const base = {
  simple: false,
  locked: false,
  approval: false,
  attaching: false,
  listening: false,
  replying: false,
  busy: true,
  queued: false,
  steerInterrupts: false,
  busyName: "Otto",
  sendLabel: "Enter",
  members: [],
  jevOn: false,
  goal: false,
  botName: "Otto",
  setupHint: null,
};

describe("the busy composer and the Steer preference", () => {
  it("promises steering only when the engine reports it can take a message mid-turn", () => {
    expect(composerPlaceholder({ ...base, busySend: "steer", canSteer: true }))
      .toBe("Otto is working — Enter sends this into the running turn");
    expect(composerPlaceholder({ ...base, busySend: "steer", canSteer: true, queued: true }))
      .toBe("Otto is working — press Enter again to steer the queued message into the running turn");
  });

  it("says Enter stops the turn when a 1:1 chat's engine cannot steer, instead of promising a queue", () => {
    expect(composerPlaceholder({ ...base, busySend: "steer", canSteer: false, steerInterrupts: true }))
      .toBe("Otto is working — Enter stops this turn and sends this message now");
  });

  it("still queues in a room whose engine cannot steer", () => {
    expect(composerPlaceholder({ ...base, busySend: "steer", canSteer: false, group: { id: "room" } as never }))
      .toBe("Otto is working — Enter queues your message");
  });

  it("keeps the plain queue line for the Queue preference", () => {
    expect(composerPlaceholder({ ...base, busySend: "queue", canSteer: false }))
      .toBe("Otto is working — sends when this turn finishes");
  });

  it("names the send action honestly", () => {
    expect(sendLabels({ simple: false, busySend: "steer", busy: true, canSteer: true, steerInterrupts: false, name: "Otto", sendLabel: "Enter" }))
      .toEqual({ label: "Send into the running turn", title: "Send into the running turn" });
    expect(sendLabels({ simple: false, busySend: "steer", busy: true, canSteer: false, steerInterrupts: true, name: "Otto", sendLabel: "Enter" }))
      .toEqual({ label: "Stop this turn and send", title: "Stop this turn and send" });
    expect(sendLabels({ simple: false, busySend: "steer", busy: true, canSteer: false, steerInterrupts: false, name: "Otto", sendLabel: "Enter" }))
      .toEqual({ label: "Queue message", title: "Sends when the current turn finishes" });
    expect(sendLabels({ simple: false, busySend: "queue", busy: true, canSteer: false, steerInterrupts: false, name: "Otto", sendLabel: "Enter" }))
      .toEqual({ label: "Queue message", title: "Sends when the current turn finishes" });
  });
});

describe("when Steer stops the turn instead of queueing", () => {
  it("is only a 1:1 chat, busy, with Steer chosen and no mid-turn steering", () => {
    expect(steerInterruptsTurn({ direct: true, busy: true, busySend: "steer", canSteer: false })).toBe(true);
    expect(steerInterruptsTurn({ direct: false, busy: true, busySend: "steer", canSteer: false }), "rooms queue").toBe(false);
    expect(steerInterruptsTurn({ direct: true, busy: false, busySend: "steer", canSteer: false }), "not busy").toBe(false);
    expect(steerInterruptsTurn({ direct: true, busy: true, busySend: "queue", canSteer: false }), "Queue chosen").toBe(false);
    expect(steerInterruptsTurn({ direct: true, busy: true, busySend: "steer", canSteer: true }), "the engine steers").toBe(false);
  });
});
