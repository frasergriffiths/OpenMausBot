// @vitest-environment happy-dom
// The pill style names the open thread and offers New thread beside it; the tabs style draws the same control from the
// same definition. These mount ChatThreadChip on its own, outside ChatView.
import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({ dispatch: vi.fn(), state: { pendingQueued: {} } as Record<string, unknown> }));
vi.mock("@/state/store", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/state/store")>(),
  useStore: () => ({ state: f.state, dispatch: f.dispatch }),
}));

const { ChatThreadChip } = await import("./ChatThreadBar");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const at = Date.now();
const task = (threadId: string, extra: Record<string, unknown> = {}) => ({
  threadId, title: `Thread ${threadId}`, createdAt: at, updatedAt: at, modelSelection: { instanceId: "m", model: "m" },
  activity: "idle", ...extra,
});
const makeBot = (extra: Record<string, unknown> = {}) => ({
  id: "pepper", threadId: "b", name: "Pepper", title: "", description: "", color: "green", notifications: true,
  unread: false, busy: false, messages: [], modelSelection: { instanceId: "m", model: "m" },
  tasks: [task("a"), task("b")], ...extra,
} as never);

let host: HTMLDivElement;
let root: Root;

const draw = (bot: Parameters<typeof ChatThreadChip>[0]["bot"]) => act(() => root.render(createElement(ChatThreadChip, { bot })));
beforeEach(() => {
  f.dispatch.mockReset();
  f.state = { pendingQueued: {} };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const newThread = () => host.querySelector<HTMLButtonElement>("[data-thread-new]");

describe("the pill's title bar", () => {
  it("draws the chip and one New thread button in one row", () => {
    draw(makeBot());
    const row = host.querySelector("[data-thread-chip-row]");
    expect(row).not.toBeNull();
    expect(row!.querySelector("[data-thread-chip-bar]")).not.toBeNull();
    expect(row!.querySelectorAll("[data-thread-new]")).toHaveLength(1);
    expect(newThread()!.getAttribute("aria-label")).toBe("New thread");
    expect(newThread()!.title).toBe("New thread");
  });

  it("dispatches the same newTask the tabs strip's + dispatches", () => {
    draw(makeBot());
    act(() => newThread()!.click());
    expect(f.dispatch).toHaveBeenCalledTimes(1);
    expect(f.dispatch).toHaveBeenCalledWith({ type: "newTask", botId: "pepper" });
  });

  it("adds no second New thread control when the switcher is open", () => {
    draw(makeBot());
    act(() => host.querySelector<HTMLButtonElement>("[data-thread-chip-bar]")!.click());
    const sheet = document.querySelector("[data-thread-switcher]");
    expect(sheet).not.toBeNull();
    expect(sheet!.querySelector("[data-thread-new]")).toBeNull();
    expect(document.querySelectorAll("[data-thread-new]")).toHaveLength(1);
  });

  it("draws nothing, New thread included, when the open thread is gone", () => {
    draw(makeBot({ threadId: "gone" }));
    expect(host.innerHTML).toBe("");
  });
});
