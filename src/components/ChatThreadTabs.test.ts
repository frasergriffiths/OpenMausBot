// @vitest-environment happy-dom
import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({ dispatch: vi.fn(), open: vi.fn(), state: {} as Record<string, unknown> }));
vi.mock("@/state/store", () => ({ useStore: () => ({ state: f.state, dispatch: f.dispatch }), openBotThread: f.open }));

const { ChatThreadTabs } = await import("./ChatThreadTabs");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const at = Date.now();
const task = (threadId: string, extra: Record<string, unknown> = {}) => ({
  threadId, title: `Thread ${threadId}`, createdAt: at, updatedAt: at, modelSelection: { instanceId: "m", model: "m" },
  activity: "idle", ...extra,
});
const makeBot = (extra: Record<string, unknown> = {}) => ({
  id: "pepper", threadId: "b", name: "Pepper", title: "", description: "", color: "green", notifications: true,
  unread: false, busy: false, messages: [], modelSelection: { instanceId: "m", model: "m" },
  tasks: [task("a"), task("b"), task("c", { archivedAt: at })], ...extra,
} as never);

let host: HTMLDivElement;
let root: Root;

const draw = (bot: Parameters<typeof ChatThreadTabs>[0]["bot"]) => act(() => root.render(createElement(ChatThreadTabs, { bot })));
beforeEach(() => {
  f.dispatch.mockReset();
  f.open.mockReset();
  f.state = {};
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const tab = (threadId: string) => host.querySelector<HTMLButtonElement>(`[data-thread-tab="${threadId}"]`);
const close = (threadId: string) => host.querySelector<HTMLDivElement>(`[data-thread-tab-box="${threadId}"]`)!.querySelector<HTMLButtonElement>('button[aria-label^="Archive"]')!;

describe("the switcher's tabs", () => {
  it("draws one tab per open conversation, the active one selected, with no nested buttons", () => {
    draw(makeBot());
    expect([...host.querySelectorAll("[data-thread-tab]")].map((node) => node.textContent)).toEqual(["Thread a", "Thread b"]);
    expect(tab("c")).toBeNull();
    expect(tab("b")!.getAttribute("aria-selected")).toBe("true");
    expect(tab("a")!.getAttribute("aria-selected")).toBe("false");
    expect(host.querySelectorAll("[data-thread-tab] button")).toHaveLength(0);
  });

  it("keeps the archived conversation that is open as the one archived tab", () => {
    draw(makeBot({ threadId: "c" }));
    expect([...host.querySelectorAll("[data-thread-tab]")].map((node) => node.textContent)).toEqual(["Thread a", "Thread b", "Thread c"]);
    expect(tab("c")!.getAttribute("aria-selected")).toBe("true");
  });

  it("closing a tab archives it and leaves the open conversation alone", () => {
    draw(makeBot());
    act(() => close("a").click());
    expect(f.open).not.toHaveBeenCalled();
    expect(f.dispatch).toHaveBeenCalledWith({ type: "updateTask", botId: "pepper", threadId: "a", patch: { archivedAt: expect.any(Number) } });
  });

  it("closing the open tab selects the next one before archiving it", () => {
    draw(makeBot());
    act(() => close("b").click());
    expect(f.open).toHaveBeenCalledWith(expect.anything(), expect.anything(), "a", false);
    expect(f.dispatch).toHaveBeenCalledWith({ type: "updateTask", botId: "pepper", threadId: "b", patch: { archivedAt: expect.any(Number) } });
  });

  it("will not close a thread that is working", () => {
    draw(makeBot({ tasks: [task("a", { busy: true }), task("b")] }));
    expect(close("a").disabled).toBe(true);
    act(() => close("a").click());
    expect(f.dispatch).not.toHaveBeenCalled();
  });

  it("shows a queued count in the leading slot and keeps it in the status", () => {
    f.state = { pendingQueued: { a: [{}, {}] } };
    draw(makeBot());
    expect(host.querySelector('[data-thread-tab-box="a"]')!.textContent).toContain("2");
    expect(tab("a")!.getAttribute("aria-label")).toMatch(/queued/i);
  });

  it("archives with Delete on the focused tab, and arrows move the selection", () => {
    draw(makeBot());
    act(() => tab("b")!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })));
    expect(f.open).toHaveBeenCalledWith(expect.anything(), expect.anything(), "a", false);
    f.dispatch.mockClear();
    act(() => tab("b")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true })));
    expect(f.dispatch).toHaveBeenCalledWith({ type: "updateTask", botId: "pepper", threadId: "b", patch: { archivedAt: expect.any(Number) } });
  });
});
