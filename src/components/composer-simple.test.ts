// The composer's busy copy is the only place a chosen Steer mode can be explained when the engine cannot take it.
// These are the pure functions the composer renders, so the fallback is pinned without mounting a whole thread.
import { beforeAll, describe, expect, it } from "vitest";
import { setLocale } from "@/lib/i18n";
import { composerPlaceholder, sendLabels } from "./composer-simple";

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

  it("says the engine cannot steer when Steer is chosen but unsupported, instead of a plain queue line", () => {
    expect(composerPlaceholder({ ...base, busySend: "steer", canSteer: false }))
      .toBe("Otto is working — this engine can’t take steering, so Enter queues it");
    expect(composerPlaceholder({ ...base, busySend: "queue", canSteer: false }))
      .toBe("Otto is working — sends when this turn finishes");
  });

  it("names the send action honestly when steering falls back to a queue", () => {
    expect(sendLabels({ simple: false, busySend: "steer", busy: true, canSteer: true, name: "Otto", sendLabel: "Enter" }))
      .toEqual({ label: "Send into the running turn", title: "Send into the running turn" });
    expect(sendLabels({ simple: false, busySend: "steer", busy: true, canSteer: false, name: "Otto", sendLabel: "Enter" }))
      .toEqual({ label: "Queue for Otto — this engine can’t steer", title: "Queue for Otto — this engine can’t steer" });
    expect(sendLabels({ simple: false, busySend: "queue", busy: true, canSteer: false, name: "Otto", sendLabel: "Enter" }))
      .toEqual({ label: "Queue message", title: "Sends when the current turn finishes" });
  });
});
