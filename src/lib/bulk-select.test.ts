import { describe, expect, it } from "vitest";
import {
  BULK_DELETE_CHUNK,
  chunkIds,
  isTickable,
  opensRowMenuFromKey,
  summarizeDelete,
  type SelectableRow,
} from "./bulk-select";

const row = (threadId: string, extra: Partial<SelectableRow> = {}): SelectableRow => ({ threadId, ...extra });

describe("isTickable", () => {
  it("rejects working and busy rows, accepts idle and waiting ones", () => {
    expect(isTickable(row("a"))).toBe(true);
    expect(isTickable(row("a", { activity: "waiting-on-you" }))).toBe(true);
    expect(isTickable(row("a", { busy: true }))).toBe(false);
    expect(isTickable(row("a", { activity: "working" }))).toBe(false);
  });
});

describe("chunkIds", () => {
  it("splits at the server-friendly chunk size and keeps order", () => {
    expect(BULK_DELETE_CHUNK).toBe(200);
    const ids = Array.from({ length: 450 }, (_, i) => `t${i}`);
    const parts = chunkIds(ids);
    expect(parts.map((p) => p.length)).toEqual([200, 200, 50]);
    expect(parts.flat()).toEqual(ids);
  });
  it("returns no chunks for no ids", () => {
    expect(chunkIds([])).toEqual([]);
  });
});

describe("summarizeDelete", () => {
  it("counts deleted and groups refused ids by reason", () => {
    const summary = summarizeDelete([
      { deleted: ["a", "b"], refused: [{ threadId: "c", reason: "busy" }] },
      { deleted: ["d"], refused: [{ threadId: "e", reason: "not-found" }, { threadId: "f", reason: "busy" }] },
    ]);
    expect(summary).toEqual({ deleted: 3, busy: 2, missing: 1 });
  });
});

describe("opensRowMenuFromKey", () => {
  it("opens the row menu from ContextMenu and Shift+F10", () => {
    expect(opensRowMenuFromKey("ContextMenu", false)).toBe(true);
    expect(opensRowMenuFromKey("F10", true)).toBe(true);
    expect(opensRowMenuFromKey("F10", false)).toBe(false);
    expect(opensRowMenuFromKey("a", true)).toBe(false);
  });
});
