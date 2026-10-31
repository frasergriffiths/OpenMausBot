import { describe, expect, it, vi } from "vitest";

import { SHOW_THREADS_KEY, setShowThreads, useShowThreads, useShowThreadsChoice } from "./thread-preferences";

// Threads are gone: one conversation per bot, and Reset Context is how a person starts again. The stored preference
// is read only so an older install does not throw; nothing may turn threads back on.
describe("local thread visibility", () => {
  it("always answers no, whichever hook asks", () => {
    expect(useShowThreadsChoice()).toBe(false);
    expect(useShowThreads()).toBe(false);
  });

  it("never writes the stored preference, so an older install's key is left alone", () => {
    const setItem = vi.fn();
    const removeItem = vi.fn();
    vi.stubGlobal("window", { localStorage: { setItem, removeItem } });
    try {
      setShowThreads(true);
      setShowThreads(false);
      expect(setItem).not.toHaveBeenCalled();
      expect(removeItem).not.toHaveBeenCalled();
      expect(SHOW_THREADS_KEY).toBe("omb-show-threads");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
