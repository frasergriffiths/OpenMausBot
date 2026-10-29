// @vitest-environment happy-dom
// Simple mode hides the bot panel's Conversations card, so the chat header's thread chip is the only place to switch
// threads there. These mount the real ChatView and fail if the chip or its switcher goes away.
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Action, AppState, Bot, InstanceInfo, Task } from "@/state/store";

vi.mock("./DesktopCapabilities", async (importOriginal) => ({
  ...await importOriginal<typeof import("./DesktopCapabilities")>(),
  useDesktopCapabilities: () => ({ capabilities: { dictation: { available: false }, host: { packaged: true, platform: "other" }, localComputer: { available: false } }, ready: true }),
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/cloud-guest", () => ({ useCanWriteIn: () => true, useReactor: () => "user" }));
vi.mock("./ModelPicker", () => ({ ModelPicker: () => null }));

const fixture = { advanced: false, threadsShown: false, threadsWanted: true };
vi.mock("@/lib/interface-mode", () => ({ useAdvancedMode: () => fixture.advanced, setAdvancedMode: vi.fn() }));
vi.mock("@/lib/thread-preferences", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/thread-preferences")>(),
  useShowThreads: () => fixture.threadsShown,
  useShowThreadsChoice: () => fixture.threadsWanted,
}));

const { ChatView } = await import("./ChatView");
const { BotEditorStore, initialState, reducer } = await import("@/state/store");

const at = 1_700_000_000_000;
const tasks: Task[] = Array.from({ length: 4 }, (_, index) => ({
  threadId: `thread-${index + 1}`,
  title: `Conversation ${index + 1}`,
  createdAt: at - index * 1_000,
  updatedAt: at - index * 1_000,
  lastThreadOrderAt: at - index * 1_000,
  modelSelection: { instanceId: "test", model: "m" },
  approvalMode: "ask",
  busy: false,
  activity: "idle",
}));
const bot: Bot = {
  id: "pepper", threadId: "thread-1", name: "Pepper", title: "", description: "", color: "green",
  notifications: true, unread: false, busy: false, messages: [],
  modelSelection: { instanceId: "test", model: "m" },
  tasks,
};

let state: AppState;
const actions: Action[] = [];
let root: Root;
let container: HTMLDivElement;

const draw = () => {
  const value = {
    state,
    dispatch: (action: Action) => {
      actions.push(action);
      state = reducer(state, action);
      draw();
    },
    flushBotPatches: async () => null,
    refreshInstances: async () => {},
    refreshModels: async () => {},
  };
  const current = state.bots.find((entry) => entry.id === state.selectedId)!;
  flushSync(() => root.render(createElement(BotEditorStore, { value, children: createElement(ChatView, { bot: current }) })));
};

beforeAll(() => {
  vi.stubGlobal("fetch", () => new Promise(() => {}));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  state = {
    ...initialState,
    connected: true,
    selectedId: bot.id,
    bots: [bot],
    instances: [{ instanceId: "test", driverKind: "codex", displayName: "Test", snapshot: { state: "available" } } as InstanceInfo],
  };
});

afterAll(() => {
  flushSync(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const chip = () => document.querySelector<HTMLButtonElement>("[data-thread-chip-bar]");
const sheet = () => document.querySelector<HTMLElement>("[data-thread-switcher]");
const rows = () => [...document.querySelectorAll<HTMLButtonElement>("[data-thread-row]")];

describe("the thread chip in Simple mode", () => {
  it("names the open thread in the chat header even though Simple mode hides the conversations panel", () => {
    fixture.advanced = false;
    fixture.threadsShown = false;
    fixture.threadsWanted = true;
    draw();

    expect(chip()).not.toBeNull();
    expect(chip()!.textContent).toContain("Conversation 1");
    expect(chip()!.getAttribute("aria-expanded")).toBe("false");
  });

  it("still hides the chip when the person has turned threads off", () => {
    fixture.threadsWanted = false;
    draw();

    expect(chip()).toBeNull();
  });

  it("opens the switcher with every thread, the current one marked", () => {
    fixture.threadsWanted = true;
    draw();
    flushSync(() => chip()!.click());
    expect(sheet()).not.toBeNull();
    expect(sheet()!.getAttribute("role")).toBe("dialog");
    expect(sheet()!.id).toBe("thread-switcher");
    expect(chip()!.getAttribute("aria-controls")).toBe("thread-switcher");
    expect(rows()).toHaveLength(4);
    expect(rows().filter((row) => row.getAttribute("aria-current") === "true")).toHaveLength(1);
    expect(rows()[0]!.getAttribute("aria-current")).toBe("true");
  });

  const settle = async () => { await new Promise((resolve) => setTimeout(resolve, 260)); };

  it("switches to the chosen thread and closes the switcher", async () => {
    draw();
    flushSync(() => chip()!.click());
    actions.length = 0;
    flushSync(() => rows()[2]!.click());
    await settle();
    expect(sheet()).toBeNull();
    expect(actions.some((action) => action.type === "switchTask" || action.type === "select")).toBe(true);
    expect(document.activeElement).toBe(chip());
  });

  it("lets Tab move to the row actions instead of closing the sheet", () => {
    draw();
    flushSync(() => chip()!.click());
    expect(sheet()).not.toBeNull();
    flushSync(() => {
      (document.activeElement ?? sheet()!).dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    });
    // Tab is no longer swallowed: the sheet stays open, and its kebab buttons are real tab stops.
    expect(sheet()).not.toBeNull();
    const kebabs = [...sheet()!.querySelectorAll<HTMLButtonElement>('button[aria-haspopup="menu"]')];
    expect(kebabs.length).toBe(4);
    for (const kebab of kebabs) expect(kebab.tabIndex).toBe(0);
  });

  it("closes on Escape and returns focus to the chip", async () => {
    draw();
    flushSync(() => chip()!.click());
    flushSync(() => {
      sheet()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    await settle();
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(chip());
  });

  it("puts no New thread button in the header, and none at the end of the switcher", () => {
    fixture.advanced = false;
    fixture.threadsShown = false;
    fixture.threadsWanted = true;
    draw();

    expect(document.querySelector("[data-chathead-new-thread]")).toBeNull();
    flushSync(() => chip()!.click());
    expect(sheet()!.querySelector('[data-switcher-focus="new"]')).toBeNull();
    expect(sheet()!.textContent).not.toContain("New thread");
    expect(sheet()!.querySelector('[role="separator"]')).toBeNull();
  });

  it("opens a row's three-dot menu over the switcher, not clipped inside it", () => {
    fixture.threadsWanted = true;
    draw();
    flushSync(() => chip()!.click());
    const kebab = sheet()!.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;
    flushSync(() => kebab.click());
    const menu = document.querySelector<HTMLElement>('[data-sidebar-popover-menu="anchored"]');
    expect(menu).not.toBeNull();
    expect(sheet()!.contains(menu)).toBe(false);
    expect(menu!.parentElement).toBe(document.body);
  });

  it("closes the switcher when the chip is pressed a second time, instead of reopening it", async () => {
    fixture.threadsWanted = true;
    draw();
    flushSync(() => chip()!.click());
    expect(sheet()).not.toBeNull();
    // The real press, in its own event: a pointerdown outside the sheet, then the chip's own click.
    flushSync(() => chip()!.dispatchEvent(new Event("pointerdown", { bubbles: true })));
    flushSync(() => chip()!.click());
    await settle();
    expect(sheet()).toBeNull();
    expect(chip()!.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps an archived thread in its own group at the end, not mixed into the open ones", () => {
    fixture.threadsWanted = true;
    const archived = { ...tasks[0]!, threadId: "thread-1", title: "Put away", archivedAt: at };
    state.bots = [{ ...bot, tasks: [archived, ...tasks.slice(1)] }];
    draw();
    flushSync(() => chip()!.click());
    const list = sheet()!;
    const heading = list.querySelector("[data-thread-switcher-archived]");
    expect(heading?.textContent).toBe("Archived");
    const all = rows();
    expect(all.map((row) => row.getAttribute("data-thread-row"))).toEqual(["thread-2", "thread-3", "thread-4", "thread-1"]);
    // The archived row comes after the heading, so it is never between two open ones.
    expect(heading!.compareDocumentPosition(all[3]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
