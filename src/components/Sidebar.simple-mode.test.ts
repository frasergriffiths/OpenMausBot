import { Children, createElement, isValidElement, type KeyboardEvent, type MemoExoticComponent, type MouseEvent, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialState, type AppState, type Bot, type Group } from "@/state/store";
import type { SidebarDensity } from "@/lib/sidebar-preferences";

const fixture = vi.hoisted(() => ({ showThreads: true, state: {} as Partial<AppState>, dispatch: vi.fn() }));
vi.mock("@/lib/thread-preferences", () => ({ useShowThreads: () => fixture.showThreads }));
vi.mock("./DesktopCapabilities", () => ({ useDesktopCapabilities: () => ({}) }));
vi.mock("react-dom", () => ({ createPortal: (node: ReactNode) => node }));
vi.mock("@/state/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/state/store")>();
  return { ...original, useStore: () => ({ state: { ...original.initialState, ...fixture.state }, dispatch: fixture.dispatch }) };
});

import { BotListItem, BotThreadList, botRowProps, GroupListItem, PinnedBotCircle, type BotRowProps } from "./Sidebar";

const bot: Bot = {
  id: "atlas", threadId: "last-selected", name: "Atlas", title: "", description: "",
  notifications: true, color: "green", unread: true,
  modelSelection: { instanceId: "fake", model: "test" }, messages: [],
  projects: [{ id: "private-folder", name: "Quiet folder" }],
  tasks: [
    { threadId: "last-selected", title: "Last selected conversation", createdAt: 1 },
    { threadId: "idle-history", title: "Idle history", createdAt: 2, projectId: "private-folder" },
    { threadId: "approval", title: "Review permission", createdAt: 3, busy: false, activity: "waiting-on-you", projectId: "private-folder" },
    { threadId: "working", title: "Running job", createdAt: 4, busy: true, activity: "working" },
    { threadId: "queued", title: "Next job", createdAt: 5 },
    { threadId: "unread", title: "Finished reply", createdAt: 6, unread: true },
  ],
};
const densities: SidebarDensity[] = ["expanded", "icons"];
const botRow = (BotListItem as MemoExoticComponent<(props: BotRowProps) => ReactNode>).type;
const pinnedCircle = (PinnedBotCircle as MemoExoticComponent<(props: BotRowProps) => ReactNode>).type;
const rowProps = (density: SidebarDensity, candidate: Bot = bot, query = "") =>
  botRowProps({ ...initialState, ...fixture.state }, fixture.dispatch, candidate, { density, query, onMenu: vi.fn() });

type ElementProps = { children?: ReactNode; onClick?: (event: MouseEvent) => void; onKeyDown?: (event: KeyboardEvent) => void; [key: string]: unknown };
function findElement(tree: ReactNode, attribute: string, value: string): ReactElement<ElementProps> | undefined {
  for (const child of Children.toArray(tree)) {
    if (!isValidElement<ElementProps>(child)) continue;
    if (child.props[attribute] === value) return child;
    const found = findElement(child.props.children, attribute, value);
    if (found) return found;
  }
}

beforeEach(() => {
  fixture.showThreads = true;
  fixture.state = { bots: [bot], selectedId: "other-bot", activeView: "chat", pendingQueued: { queued: [{ queueId: "q", text: "next" }] } };
  fixture.dispatch.mockClear();
  vi.stubGlobal("window", { innerWidth: 1024, innerHeight: 768 });
  vi.stubGlobal("document", { body: {} });
  vi.stubGlobal("HTMLInputElement", class {});
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("bot-first sidebar", () => {
  it("uses plain labels for bot and room tool previews", () => {
    fixture.showThreads = false;
    const messages: Bot["messages"] = [{ id: "step", role: "bot", kind: "activity", at: 1, tool: { name: "mcp__omb__computer_batch", ok: true } }];
    const candidate = { ...bot, messages, tasks: [], projects: [] };
    const group: Group = { id: "room", threadId: "room-thread", name: "Team", memberIds: [bot.id], messages, defaultResponder: { kind: "mentions" }, bulletin: "", unread: false, createdAt: 1 };
    const expected = "Use the screen";
    const other = "mcp__omb__computer_batch";
    for (const markup of [
      renderToStaticMarkup(createElement(BotListItem, rowProps("expanded", candidate))),
      renderToStaticMarkup(createElement(GroupListItem, { group, density: "expanded", onMenu: vi.fn() })),
    ]) {
      expect(markup).toContain(expected);
      expect(markup).not.toContain(other);
    }
  });

  it.each([
    { enabled: false, density: "expanded", size: 36, spacing: ["gap-2", "rounded-[10px]", "py-2", "pl-2", "pr-2", "md:h-[54px]"] },
    { enabled: false, density: "icons", size: 36, spacing: ["h-[54px]", "justify-center"] },
    { enabled: true, density: "expanded", size: 36, spacing: ["gap-2", "rounded-[10px]", "py-2", "pl-6", "pr-[5.75rem]", "md:h-[54px]"] },
  ] as const)("sizes bot portraits and row spacing in $density density with threads $enabled $density", ({ enabled, density, size, spacing }) => {
    fixture.showThreads = enabled;
    for (const avatar of [{}, { avatarUrl: "/api/attachments/portrait.png", avatarCrop: "circle" as const }]) {
      let tree: ReactNode;
      function Capture() { tree = botRow(rowProps(density, { ...bot, ...avatar })); return tree; }
      const markup = renderToStaticMarkup(createElement(Capture));
      const row = findElement(tree, "data-sidebar-bot-row", bot.id)!;
      expect(String(row.props.className).split(" ")).toEqual(expect.arrayContaining([...spacing]));
      expect(markup).toContain(avatar.avatarUrl
        ? `width="${size}" height="${size}"`
        : `width="${size}px" height="${size}px"`);
    }
  });

  for (const enabled of [true, false]) {
    it.each(densities)(`opens the last selected conversation on mouse or keyboard, %s density, threads ${enabled ? "on" : "off"}`, (density) => {
      fixture.showThreads = enabled;
      let tree: ReactNode;
      function Capture() { tree = botRow(rowProps(density)); return tree; }
      renderToStaticMarkup(createElement(Capture));
      const row = findElement(tree, "data-sidebar-bot-row", bot.id)!;
      row.props.onClick!({ type: "click", target: {} } as MouseEvent);
      expect(fixture.dispatch).toHaveBeenCalledExactlyOnceWith({ type: "select", id: bot.id });
      expect(bot.threadId).toBe("last-selected");
      for (const key of ["Enter", " "]) {
        fixture.dispatch.mockClear();
        const preventDefault = vi.fn();
        row.props.onKeyDown!({ key, preventDefault } as unknown as KeyboardEvent);
        expect(preventDefault).toHaveBeenCalledOnce();
        expect(fixture.dispatch).toHaveBeenCalledExactlyOnceWith({ type: "select", id: bot.id });
      }
    });
  }


  it("uses a 14px medium name and a 13px preview in the expanded row", () => {
    fixture.showThreads = false;
    const markup = renderToStaticMarkup(createElement(BotListItem, rowProps("expanded", { ...bot, tasks: [], projects: [] })));
    const name = markup.match(/<span class="flex min-w-0 grow items-center gap-1\.5 truncate text-ink ([^"]*)"/)?.[1];
    expect(name).toBe("text-[14px] font-medium");
    expect(markup).toContain("truncate text-[13px] leading-[18px]");
    expect(markup).toContain("md:h-[54px]");
    expect(markup).toContain('width="36px" height="36px"');
  });

  it("puts one trailing cluster of the engine mark then three dots after the text block, with the unread dot still in the name line", () => {
    fixture.showThreads = false;
    fixture.state = { ...fixture.state, instances: [{ instanceId: "fake", driverKind: "claudeAgent", displayName: "Claude" }] as unknown as AppState["instances"] };
    const candidate = { ...bot, tasks: [], projects: [], unread: true, messages: [{ id: "m", role: "bot", kind: "text", text: "Done.", at: 1 }] } as Bot;
    let tree: ReactNode;
    function Capture() { tree = botRow(rowProps("expanded", candidate)); return tree; }
    const markup = renderToStaticMarkup(createElement(Capture));
    const title = markup.slice(markup.indexOf('data-sidebar-bot-title=""'), markup.indexOf(">Done.<"));
    expect(markup).toContain('<span class="size-2 shrink-0 rounded-full bg-accent" aria-label="Unread threads"></span>');
    expect(title).not.toContain('data-bot-actions="atlas"');
    expect(title).not.toContain('data-testid="model-badge"');

    const cluster = markup.slice(markup.indexOf('class="ms-auto flex shrink-0 items-center gap-1 self-center"'));
    expect(cluster.indexOf('data-provider-mark="brand"')).toBeGreaterThan(-1);
    expect(cluster.indexOf('data-bot-actions="atlas"')).toBeLessThan(cluster.indexOf('data-provider-mark="brand"'));
    expect(markup).toContain('class="ms-auto flex shrink-0 items-center gap-1 self-center"');
    expect(markup).toContain('data-provider-mark="brand"');
    expect(markup).not.toContain('data-row-dot=""');
    expect(markup.match(/data-provider-mark=/g)).toHaveLength(1);
    expect(markup).toContain('class="flex items-baseline justify-between gap-2"');
    expect(String(findElement(tree, "data-sidebar-bot-row", bot.id)!.props.className)).not.toContain("group-hover:pr-9");
    expect(markup).not.toContain("group-hover:pr-7");
    expect(markup).toMatch(/data-bot-actions="atlas"[^>]*class="[^"]*\bsize-6\b[^"]*\bopacity-0\b/);
  });

  it("keeps a Simple row's ⋯ visible while its menu is open", () => {
    fixture.showThreads = false;
    const candidate = { ...bot, tasks: [], projects: [] };
    const closed = renderToStaticMarkup(createElement(BotListItem, { ...rowProps("expanded", candidate), menuOpen: false }));
    expect(closed).toMatch(/data-bot-actions="atlas"[^>]*aria-expanded="false"[^>]*class="[^"]*\baria-expanded:opacity-100\b/);
    const open = renderToStaticMarkup(createElement(BotListItem, { ...rowProps("expanded", candidate), menuOpen: true }));
    expect(open).toMatch(/data-bot-actions="atlas"[^>]*aria-expanded="true"[^>]*class="[^"]*\baria-expanded:opacity-100\b/);
  });

  it("fades the collapsed rail's engine badge", () => {
    fixture.showThreads = false;
    fixture.state = { ...fixture.state, instances: [{ instanceId: "fake", driverKind: "claudeAgent", displayName: "Claude" }] as unknown as AppState["instances"] };
    const candidate = { ...bot, tasks: [], projects: [] };
    const rail = renderToStaticMarkup(createElement(BotListItem, rowProps("icons", candidate)));
    expect(rail).toMatch(/<span data-testid="model-badge"[^>]*><span data-provider-mark="brand" class="[^"]*\bopacity-60\b/);
  });

  it("shows a waiting compact row as an amber badge and preview, and a working one as a dot on the avatar", () => {
    fixture.showThreads = false;
    const quiet = { ...bot, tasks: [], projects: [], unread: false };
    const waiting = renderToStaticMarkup(createElement(BotListItem, rowProps("expanded", { ...quiet, activity: "waiting-on-you" })));
    expect(waiting).toContain('data-testid="waiting-dot"');
    expect(waiting).toContain(">!<");
    expect(waiting).toContain("font-semibold text-warning");
    expect(waiting).toContain('role="status"');
    const working = renderToStaticMarkup(createElement(BotListItem, rowProps("expanded", { ...quiet, busy: true })));
    expect(working).toContain('data-testid="working-dot"');
    expect(working).toContain("size-2.5");
    expect(working).toContain("bg-success");
  });

  it("rings a focused row or group chat inside its edge", () => {
    fixture.showThreads = false;
    const group: Group = { id: "room", threadId: "room-thread", name: "Launch", memberIds: [bot.id], messages: [], defaultResponder: { kind: "mentions" }, bulletin: "", unread: false, createdAt: 1 };
    const simple = renderToStaticMarkup(createElement(BotListItem, rowProps("expanded", { ...bot, tasks: [], projects: [] }))) + renderToStaticMarkup(createElement(GroupListItem, { group, density: "expanded", onMenu: vi.fn() }));
    expect(simple.match(/focus-visible:outline-2 focus-visible:-outline-offset-2! focus-visible:outline-focus/g)).toHaveLength(2);
    expect(simple).not.toContain("focus-visible:ring-accent/60");
  });

  it("hides even the selected row's actions until hover or focus", () => {
    fixture.showThreads = false;
    fixture.state = { ...fixture.state, selectedId: bot.id, activeView: "chat" };
    const candidate = { ...bot, tasks: [], projects: [] };
    const simple = renderToStaticMarkup(createElement(BotListItem, rowProps("expanded", candidate)));
    expect(simple).toContain("bg-raised");
    expect(simple).toMatch(/data-bot-actions="atlas"[^>]*class="[^"]*\bopacity-0\b[^"]*\bgroup-hover:pointer-events-auto/);
    expect(simple).toContain('class="flex items-baseline justify-between gap-2"');
  });

  it("marks an unread group chat with one dot in its preview line", () => {
    fixture.showThreads = false;
    const group: Group = { id: "room", threadId: "room-thread", name: "Launch", memberIds: [bot.id], messages: [], defaultResponder: { kind: "mentions" }, bulletin: "", unread: true, createdAt: 1 };
    const markup = renderToStaticMarkup(createElement(GroupListItem, { group, density: "expanded", onMenu: vi.fn() }));
    expect(markup.match(/rounded-full bg-accent/g)).toHaveLength(1);
    expect(markup).toContain("size-2 shrink-0 rounded-full bg-accent");
  });

  it("draws no engine mark for a bot with no AI yet or in a group chat", () => {
    fixture.showThreads = false;
    fixture.state = { ...fixture.state, instances: [{ instanceId: "fake", driverKind: "claudeAgent", displayName: "Claude" }] as unknown as AppState["instances"] };
    const candidate = { ...bot, tasks: [], projects: [] };
    expect(renderToStaticMarkup(createElement(BotListItem, rowProps("expanded", { ...candidate, modelSelection: { instanceId: "none", model: "m" } })))).not.toContain("data-provider-mark");
    const group: Group = { id: "room", threadId: "room-thread", name: "Launch", memberIds: [bot.id], messages: [], defaultResponder: { kind: "mentions" }, bulletin: "", unread: false, createdAt: 1 };
    expect(renderToStaticMarkup(createElement(GroupListItem, { group, density: "expanded", onMenu: vi.fn() }))).not.toContain("data-provider-mark");
  });

  it.each(["expanded"] as const)("keeps a Simple row to its name, preview and one faded engine mark, naming role, Chief and engine in its tooltip, %s density", (density) => {
    fixture.showThreads = false;
    const instances = [{ instanceId: "fake", driverKind: "claude", displayName: "Claude", models: { options: [{ id: "test", label: "Sonnet" }] } }] as unknown as AppState["instances"];
    fixture.state = { ...fixture.state, instances, selectedId: bot.id };
    const candidate = { ...bot, title: "Research", chiefOfStaff: true, pinned: true, tasks: [], projects: [], messages: [{ id: "m", role: "bot", kind: "text", text: "Done.", at: 1 }] } as Bot;
    let tree: ReactNode;
    function Capture() { tree = botRow(rowProps(density, candidate)); return tree; }
    const markup = renderToStaticMarkup(createElement(Capture));
    expect(markup).not.toContain('data-testid="bot-role"');
    expect(markup.match(/data-testid="model-badge"/g)).toHaveLength(1);
    expect(markup.match(/data-provider-mark=/g)).toHaveLength(1);
    expect(markup).not.toContain('data-testid="chief-crown"');
    expect(markup).not.toContain("lucide-pin");
    expect(markup).not.toMatch(/tabular-nums text-ink-secondary transition-opacity group-hover:opacity-0/);
    const row = findElement(tree, "data-sidebar-bot-row", bot.id)!;
    expect(row.props.title).toBe("Atlas · Research · Chief of Staff · Model: Sonnet (Claude)");
  });

  it.each([
    { density: "expanded", face: 36, spacing: ["gap-2", "rounded-[10px]", "py-2", "pl-2", "pr-9", "md:h-[54px]"], name: "font-medium", preview: "text-[13px]" },
    { density: "icons", face: 36, spacing: ["h-[54px]", "justify-center"], name: "font-semibold", preview: "text-[11px]" },
  ] as const)("sizes group chat rows in $density density", ({ density, face, spacing, name, preview }) => {
    const group: Group = { id: "room", threadId: "room-thread", name: "Launch", memberIds: [bot.id], messages: [], defaultResponder: { kind: "mentions" }, bulletin: "", unread: false, createdAt: 1 };
    let tree: ReactNode;
    function Capture() { tree = GroupListItem({ group, density, onMenu: vi.fn() }); return tree; }
    const markup = renderToStaticMarkup(createElement(Capture));
    const row = findElement(tree, "data-sidebar-group-row", group.id)!;
    expect(String(row.props.className).split(" ")).toEqual(expect.arrayContaining([...spacing]));
    expect(markup).toContain(`width="${face}px" height="${face}px"`);
    expect(markup).toMatch(new RegExp(`truncate text-\\[14px\\] text-ink ${name}`));
    expect(markup).toContain(`truncate text-ink-secondary ${preview}`);
  });

  it("keeps the queued dot small", () => {
    const queuedBot: Bot = {
      ...bot,
      unread: false,
      projects: [],
      tasks: [{ threadId: "queued", title: "Next job", createdAt: 5 }],
    };
    const markup = renderToStaticMarkup(createElement(BotListItem, rowProps("expanded", queuedBot)));
    const queuedDot = markup.match(/<span[^>]*data-testid="queued-dot"[^>]*>/)?.[0] ?? "";
    expect(queuedDot).toContain("size-2.5");
    expect(queuedDot).toContain("bg-ink-secondary");
    expect(queuedDot).not.toContain("size-4");
    expect(queuedDot).not.toContain("size-5");
    expect(markup).toContain('class="truncate">Queued</span>');
    expect(markup).not.toContain("font-semibold text-warning");
    expect(markup).not.toContain("waiting-dot");
  });

  it.each(densities)("opens the thread the person last wrote in when threads are hidden, %s density", (density) => {
    const used = { ...bot, mainThreadId: "idle-history" };
    for (const enabled of [false, true]) {
      fixture.showThreads = enabled;
      const opened = enabled ? { type: "select", id: bot.id } : { type: "switchTask", botId: bot.id, threadId: "idle-history" };
      const trees: ReactNode[] = [];
      function Capture() { const tree = [botRow(rowProps(density, used)), pinnedCircle(rowProps(density, used))]; trees.push(...tree); return tree; }
      renderToStaticMarkup(createElement(Capture));
      for (const tree of trees) {
        const row = findElement(tree, "data-sidebar-bot-row", bot.id)!;
        fixture.dispatch.mockClear();
        row.props.onClick!({ type: "click", target: {} } as MouseEvent);
        expect(fixture.dispatch).toHaveBeenCalledExactlyOnceWith(opened);
        if (!row.props.onKeyDown) continue;
        fixture.dispatch.mockClear();
        row.props.onKeyDown({ key: "Enter", preventDefault: vi.fn() } as unknown as KeyboardEvent);
        expect(fixture.dispatch).toHaveBeenCalledExactlyOnceWith(opened);
      }
    }
  });

  it.each(densities)("keeps selection separate from expansion in %s density", (density) => {
    fixture.state.selectedId = bot.id;
    const markup = renderToStaticMarkup(createElement(BotListItem, rowProps(density)));
    expect(markup).not.toContain("data-sidebar-thread-row");
    if (density !== "icons") expect(markup).toContain('aria-label="Expand Atlas threads" aria-expanded="false"');
  });

  it("removes child controls and portals from a retained hidden folder list", () => {
    const markup = renderToStaticMarkup(createElement(BotThreadList, { ...rowProps("expanded"), selected: true, hidden: true }));
    expect(markup).toContain('hidden=""');
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain("data-sidebar-thread-row");
    const shown = renderToStaticMarkup(createElement(BotThreadList, { ...rowProps("expanded"), selected: true }));
    expect(shown).toContain('data-sidebar-folder-row="private-folder"');
    expect(shown).toContain('data-sidebar-thread-row="idle-history"');
  });

});
