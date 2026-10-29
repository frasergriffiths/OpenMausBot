import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/state/store";
import { deleteThreadsInBulk } from "./BulkSelectBar";
import { SidebarThreadRow } from "./SidebarThreadRow";

vi.mock("./DesktopCapabilities", () => ({ useDesktopCapabilities: () => ({}) }));
vi.mock("@/state/store", () => ({ api: vi.fn() }));

const noop = vi.fn();

describe("thread rows", () => {
  it("draws no checkbox and keeps the actions menu", () => {
    const markup = renderToStaticMarkup(createElement(SidebarThreadRow, {
      task: { threadId: "a", title: "Old chat" }, ownerId: "bot", current: false, locale: "en",
      onSelect: noop, onDelete: noop,
    }));
    expect(markup).not.toContain('role="checkbox"');
    expect(markup).not.toContain("aria-checked");
    expect(markup).toContain("Actions for");
  });
});

describe("deleting in chunks", () => {
  it("posts each chunk to the owner's route and patches the owner after each", async () => {
    const post = vi.mocked(api);
    post.mockReset();
    post.mockResolvedValueOnce({ deleted: ["a"], refused: [], bot: { id: "bot" } });
    post.mockResolvedValueOnce({ deleted: ["b"], refused: [{ threadId: "c", reason: "busy" }], bot: { id: "bot" } });
    const ids = Array.from({ length: 250 }, (_, i) => `t${i}`);
    const dispatch = vi.fn();
    const result = await deleteThreadsInBulk({ botId: "bot" }, ids, dispatch);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0]![0]).toBe("/api/bots/bot/tasks/delete");
    expect(JSON.parse(String(post.mock.calls[1]![1]!.body)).threadIds).toHaveLength(50);
    expect(dispatch.mock.calls.map(([action]) => action.type)).toEqual(["botPatched", "botPatched"]);
    expect(result).toEqual({ responses: [{ deleted: ["a"], refused: [], bot: { id: "bot" } }, { deleted: ["b"], refused: [{ threadId: "c", reason: "busy" }], bot: { id: "bot" } }] });
  });
  it("stops at a failed chunk and reports what already went", async () => {
    const post = vi.mocked(api);
    post.mockReset();
    post.mockResolvedValueOnce({ deleted: ["a"], refused: [], group: { id: "room" } });
    post.mockRejectedValueOnce(new Error("offline"));
    const dispatch = vi.fn();
    const result = await deleteThreadsInBulk({ groupId: "room" }, Array.from({ length: 450 }, (_, i) => `t${i}`), dispatch);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0]![0]).toBe("/api/groups/room/tasks/delete");
    expect(result.error).toBe("offline");
    expect(result.responses).toHaveLength(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "error", message: "offline" });
  });
});
