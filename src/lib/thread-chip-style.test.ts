import { describe, expect, it, vi } from "vitest";

import {
  loadThreadChipStyle,
  parseThreadChipStyle,
  saveThreadChipStyle,
  setThreadChipStyle,
  subscribeThreadChipStyle,
  THREAD_CHIP_STYLE_KEY,
} from "./sidebar-preferences";

const store = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    values,
  };
};

describe("the thread switcher style", () => {
  it("reads pill by default and for any value it does not know", () => {
    expect(parseThreadChipStyle(null)).toBe("pill");
    expect(parseThreadChipStyle("something")).toBe("pill");
    expect(parseThreadChipStyle("tabs")).toBe("tabs");
    expect(loadThreadChipStyle(store())).toBe("pill");
    expect(loadThreadChipStyle({ getItem: () => { throw new Error("blocked"); } })).toBe("pill");
  });

  it("saves the chosen style under openmausbot.threadChipStyle", () => {
    const storage = store();
    saveThreadChipStyle("tabs", storage);
    expect(storage.values.get(THREAD_CHIP_STYLE_KEY)).toBe("tabs");
    expect(loadThreadChipStyle(storage)).toBe("tabs");
    saveThreadChipStyle("pill", storage);
    expect(loadThreadChipStyle(storage)).toBe("pill");
  });

  it("tells the mounted switcher when the style changes", () => {
    const listener = vi.fn();
    const stop = subscribeThreadChipStyle(listener);
    setThreadChipStyle("tabs");
    expect(listener).toHaveBeenCalledTimes(1);
    setThreadChipStyle("pill");
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
  });
});
