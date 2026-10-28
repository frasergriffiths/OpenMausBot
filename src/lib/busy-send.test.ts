import { describe, expect, it } from "vitest";
import { BUSY_SEND_KEY, loadBusySendMode, parseBusySendMode, saveBusySendMode } from "./busy-send";

describe("busy send preference", () => {
  it("defaults to Queue and only accepts Steer as the other value", () => {
    expect(parseBusySendMode(null)).toBe("queue");
    expect(parseBusySendMode("steer")).toBe("steer");
    expect(parseBusySendMode("nonsense")).toBe("queue");
  });

  it("round-trips through this install's storage", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    saveBusySendMode("steer", storage);
    expect(values.get(BUSY_SEND_KEY)).toBe("steer");
    expect(loadBusySendMode(storage)).toBe("steer");
    saveBusySendMode("queue", storage);
    expect(loadBusySendMode(storage)).toBe("queue");
  });

  it("falls back to Queue when storage is blocked", () => {
    expect(loadBusySendMode({ getItem: () => { throw new Error("blocked"); } })).toBe("queue");
  });
});
