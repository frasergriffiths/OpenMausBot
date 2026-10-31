import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bot, Task } from "@/state/store";
import type { SidebarMenuItem } from "./SidebarPopoverMenu";

const fixture = vi.hoisted(() => {
  vi.stubGlobal("window", {});
  return {
    threadsChosen: false,
    menus: [] as { ariaLabel: string; items: SidebarMenuItem[]; placement?: string; openOnHover?: boolean; compact?: boolean; trigger: string }[],
    dispatch: vi.fn(),
    settingsOpen: false,
    find: vi.fn(),
  };
});
vi.mock("@/state/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/state/store")>();
  return { ...original, useStore: () => ({ state: { ...original.initialState, inspectorOpen: false, settingsOpen: fixture.settingsOpen, botSettingsSection: "usage" }, dispatch: fixture.dispatch }) };
});
vi.mock("@/lib/thread-preferences", () => ({ useShowThreads: () => fixture.threadsChosen, useShowThreadsChoice: () => fixture.threadsChosen }));
vi.mock("@/lib/chat-find", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/chat-find")>(),
  requestChatFind: fixture.find,
}));
vi.mock("./SidebarPopoverMenu", async (importOriginal) => ({
  ...await importOriginal<typeof import("./SidebarPopoverMenu")>(),
  SidebarPopoverMenu: (props: { ariaLabel: string; items: SidebarMenuItem[]; placement?: string; openOnHover?: boolean; compact?: boolean; renderTrigger: (state: { open: boolean }) => React.ReactNode }) => {
    const trigger = props.renderTrigger({ open: false });
    fixture.menus.push({ ...props, trigger: renderToStaticMarkup(createElement("div", null, trigger)) });
    return trigger;
  },
}));

const { ChatMoreMenu, ChatHeaderMenu, ChatShareMenu } = await import("./ChatMoreMenu");
afterAll(() => vi.unstubAllGlobals());

const task = (threadId: string, title: string, at: number, extra: Partial<Task> = {}): Task => ({
  threadId, title, createdAt: at, busy: false, activity: "idle", ...extra,
});
const bot: Bot = {
  id: "pepper", threadId: "side", mainThreadId: "main", name: "Pepper", title: "", description: "", color: "green",
  notifications: true, unread: false, busy: false, activeLeafId: "hi",
  messages: [{ id: "hi", role: "bot", kind: "text", text: "Hello", at: 1 }],
  modelSelection: { instanceId: "test", model: "m" },
  tasks: [
    task("main", "Our chat", 1),
    task("side", "Trip plan", 3),
    task("routine", "Morning digest", 5, { routineRunId: "run-1" }),
    task("old", "", 2),
  ],
};

function menuOf(element: ReturnType<typeof createElement>) {
  fixture.menus = [];
  renderToStaticMarkup(element);
  return fixture.menus.at(-1)!;
}
const keys = (items: SidebarMenuItem[]) => items.map((item) => item.key);

beforeEach(() => {
  fixture.threadsChosen = false;
  fixture.settingsOpen = false;
  fixture.dispatch.mockClear();
  fixture.find.mockClear();
});

describe("ChatMoreMenu, the round ⋯ for the bot panel", () => {
  it("is a round 32px button labelled More", () => {
    const menu = menuOf(createElement(ChatMoreMenu, { bot }));
    expect(menu.ariaLabel).toBe("More");
    expect(menu.placement).toBeUndefined();
    expect(menu.trigger).toContain('data-testid="chat-more"');
    expect(menu.trigger).toMatch(/class="[^"]*\bsize-8\b[^"]*\brounded-full\b/);
    expect(menu.trigger).toContain("bg-composer");
  });


  it("drops the thread items when the sidebar already shows threads", () => {
    fixture.threadsChosen = true;
    expect(keys(menuOf(createElement(ChatMoreMenu, { bot })).items)).toEqual(["find", "copy", "download", "reset-context"]);
  });




  it("leaves All threads out while the bot has one thread", () => {
    const single = { ...bot, threadId: "main", tasks: [task("main", "Our chat", 1), task("routine", "Morning digest", 5, { routineRunId: "run-1" })] };
    expect(keys(menuOf(createElement(ChatMoreMenu, { bot: single })).items)).toEqual(["find", "copy", "download", "reset-context"]);
    expect(keys(menuOf(createElement(ChatMoreMenu, { bot: { ...bot, tasks: undefined } })).items)).not.toContain("threads");
  });

  it("opens the chat's find bar for the thread on screen", () => {
    const menu = menuOf(createElement(ChatMoreMenu, { bot }));
    menu.items.find((item) => item.key === "find")!.onSelect();
    expect(fixture.find).toHaveBeenCalledWith("side");
  });

  it("shows Usage when the thread has some, and opens the panel's usage page", () => {
    fixture.settingsOpen = true;
    const withUsage: Bot = { ...bot, tasks: bot.tasks!.map((entry) => entry.threadId === "side"
      ? { ...entry, usage: { input: 1200, output: 300, costUsd: null, turns: 2 } }
      : entry) };
    const menu = menuOf(createElement(ChatMoreMenu, { bot: withUsage }));
    const usage = menu.items.find((item) => item.key === "usage");
    expect(usage?.disabled).toBeFalsy();
    expect(usage?.heading).toBeUndefined();
    usage!.onSelect();
    expect(fixture.dispatch).toHaveBeenCalledWith({ type: "toggleSettings", open: true, section: "usage" });
  });
});

describe("ChatShareMenu, the bot panel's Share", () => {
  it("copies or downloads the conversation, in those words, in the compact recipe", () => {
    const menu = menuOf(createElement(ChatShareMenu, { bot, className: "" }));
    expect(menu.items.map((item) => [item.key, item.label])).toEqual([["copy", "Copy conversation"], ["download", "Download conversation"]]);
    expect(menu.compact).toBe(true);
  });
});

describe("ChatHeaderMenu, the remote client's header ⋯", () => {
  beforeEach(() => { fixture.threadsChosen = true; });

  it("keeps every plain item, opening on hover below the header", () => {
    const menu = menuOf(createElement(ChatHeaderMenu, { bot }));
    expect(keys(menu.items)).toEqual(["find", "copy", "download", "reset-context"]);
    expect(menu.items.every((item) => !item.disabled && !String(item.heading ?? "").includes("In Advanced mode"))).toBe(true);
    expect(menu).toMatchObject({ placement: "below", openOnHover: true });
    expect(menu.trigger).toMatch(/data-testid="chat-more"/);
  });

});
