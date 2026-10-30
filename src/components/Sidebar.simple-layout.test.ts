import { Children, isValidElement, type EffectCallback, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState, Bot, Group } from "@/state/store";

const fixture = vi.hoisted(() => ({
  values: [] as unknown[], index: 0, effects: [] as EffectCallback[], advanced: false,
  state: {} as AppState, dispatch: vi.fn(), storage: new Map<string, string>(),
}));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = fixture.index++;
    if (!(index in fixture.values)) fixture.values[index] = typeof initial === "function" ? (initial as () => unknown)() : initial;
    return [fixture.values[index], (next: unknown) => {
      fixture.values[index] = typeof next === "function" ? (next as (value: unknown) => unknown)(fixture.values[index]) : next;
    }];
  },
  useRef: (initial: unknown) => {
    const index = fixture.index++;
    if (!(index in fixture.values)) fixture.values[index] = { current: initial };
    return fixture.values[index];
  },
  useCallback: (callback: unknown) => callback,
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
  useEffect: (effect: EffectCallback) => { fixture.effects.push(effect); },
  useLayoutEffect: () => {},
}));
vi.mock("react-dom", () => ({ createPortal: (node: ReactNode) => node }));
vi.mock("./MenuMotion", () => ({
  useMenuMotion: (open: boolean) => ({ shown: open, closing: false, className: "", exitProps: {} }),
  useHeldMenuMotion: (value: unknown) => ({ shown: value !== null, value, closing: false, className: "", exitProps: {} }),
}));
vi.mock("./DesktopCapabilities", async () => {
  const { initialDesktopCapabilities } = await import("@/lib/desktop");
  return { useDesktopCapabilities: () => ({ capabilities: initialDesktopCapabilities() }) };
});
vi.mock("@/lib/thread-preferences", () => ({ useShowThreads: () => fixture.advanced }));
vi.mock("@/state/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/state/store")>();
  return { ...original, useStore: () => ({ state: fixture.state, dispatch: fixture.dispatch }) };
});

import { initialState } from "@/state/store";
import { BOTS_SECTION_ID, CHANNELS_SECTION_ID, userSectionId } from "@/lib/sidebar-layout";
import { SIDEBAR_COLLAPSED_SECTIONS_KEY, SIDEBAR_DENSITY_KEY, SIDEBAR_SECTION_ORDER_KEY, SIMPLE_SIDEBAR_WIDTH_KEY, setSidebarDensity } from "@/lib/sidebar-preferences";
import { Sidebar } from "./Sidebar";
import { TeamContextMenu } from "./SidebarTeamMenu";
import { SidebarFooter } from "./SidebarFooter";
import { TeamLibraryPanel } from "./TeamLibraryPanel";
import { SidebarResizeHandle } from "./SidebarResizeHandle";
import { SidebarTileGrid } from "./SidebarTiles";
import { GlassBar, GlassScrollFrame, GlassScroller } from "./GlassScrollFrame";
import { SidebarSectionHeader } from "./SidebarSectionHeader";
import { SidebarEdgeToggle, SidebarSearchPill } from "./SidebarSimpleTop";
import { SidebarRailSeparator, SimpleRailFooter } from "./SidebarSimpleRail";
import { DesktopWorkspaceSwitcher } from "./DesktopWorkspaceSwitcher";

const bot = (id: string, extra: Partial<Bot> = {}): Bot => ({
  id, threadId: `${id}-thread`, name: id, title: "", description: "", notifications: true,
  color: "green", unread: false, modelSelection: { instanceId: "fake", model: "m" }, messages: [], ...extra,
});
const room: Group = {
  id: "room", threadId: "room-thread", name: "Launch room", memberIds: ["atlas"], messages: [],
  defaultResponder: { kind: "mentions" }, bulletin: "", unread: false, createdAt: 1,
};

type Props = { children?: ReactNode; className?: string; style?: Record<string, string>; [key: string]: unknown };
function nodes(value: ReactNode): ReactElement<Props>[] {
  return Children.toArray(value).flatMap((child) => {
    if (!isValidElement<Props>(child)) return [];
    return [child, ...nodes(child.props.children)];
  });
}
function render(collapseToIcons = false) {
  fixture.index = 0;
  fixture.effects = [];
  const root = Sidebar({ open: false, onClose: () => {}, collapseToIcons }) as ReactElement<Props>;
  return { root, tree: [root, ...nodes(root.props.children)] };
}
const sectionOrder = (tree: ReactElement<Props>[]) => tree.map((node) => node.props["data-sidebar-section-id"]).filter(Boolean);
const headers = (tree: ReactElement<Props>[]) => tree.filter((node) => node.type === SidebarSectionHeader) as ReactElement<Parameters<typeof SidebarSectionHeader>[0]>[];
const listedBots = (tree: ReactElement<Props>[]) => tree.map((node) => (node.props.bot as Bot | undefined)?.id).filter(Boolean);
const labelled = (tree: ReactElement<Props>[], label: string) => tree.some((node) => node.props["aria-label"] === label);

beforeEach(() => {
  fixture.values = [];
  fixture.advanced = false;
  fixture.storage = new Map();
  fixture.dispatch.mockClear();
  fixture.state = {
    ...initialState,
    bots: [bot("atlas"), bot("bea"), bot("dodo", { section: "Work" })],
    groups: [room],
    sections: ["Work"],
  };
  vi.stubGlobal("window", Object.assign(new EventTarget(), { innerWidth: 1280, innerHeight: 800, ogb: undefined, setTimeout, clearTimeout }));
  vi.stubGlobal("document", { body: {} });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => fixture.storage.get(key) ?? null,
    setItem: (key: string, value: string) => { fixture.storage.set(key, value); },
    removeItem: (key: string) => { fixture.storage.delete(key); },
  });
});
afterEach(() => {
  setSidebarDensity("compact");
  vi.unstubAllGlobals();
});

describe("the computer switcher's Connect row", () => {
  it("opens Settings on the Computer tab, not the Servers page", () => {
    const { tree } = render();
    const switcher = tree.find((node) => node.type === DesktopWorkspaceSwitcher) as ReactElement<{ onConnectServer?: () => void }> | undefined;
    expect(switcher?.props.onConnectServer).toBeTypeOf("function");
    fixture.dispatch.mockClear();
    switcher!.props.onConnectServer!();
    expect(fixture.dispatch).toHaveBeenCalledWith({ type: "toggleAppSettings", open: true, section: "computer" });
  });
});

describe("Simple-mode sidebar layout", () => {
  it("puts the machine switcher and the + on one centred row, both 36px, one gap apart", () => {
    const { tree } = render();
    const row = tree.find((node) => node.props["data-sidebar-top-row"] !== undefined)!;
    expect(row.props.className).toEqual(expect.stringContaining("items-center"));
    expect(row.props.className).toEqual(expect.stringContaining("h-[60px]"));
    expect(row.props.className).not.toContain("items-start");
    const slot = tree.find((node) => node.props["data-sidebar-top-slot"] !== undefined)!;
    expect(slot.props.className).toEqual(expect.stringContaining("justify-end"));
    expect(slot.props.className).not.toContain("pt-3");
    expect(slot.props.className).not.toContain("pr-2");
    const buttons = tree.find((node) => node.props["data-sidebar-top-buttons"] !== undefined)!;
    expect(buttons.props.className).toEqual(expect.stringContaining("gap-2"));
    const plus = nodes(buttons.props.children).find((node) => node.type === "button" && node.props["aria-label"] === "New or share")!;
    expect(plus.props.className).toEqual(expect.stringContaining("size-9"));
  });

  it("lists the bots with no heading, then gives group chats and a person's own departments a quiet heading with a count", () => {
    const { tree } = render();
    expect(sectionOrder(tree)).toEqual([BOTS_SECTION_ID, CHANNELS_SECTION_ID, userSectionId("Work")]);
    expect(listedBots(tree)).toEqual(["atlas", "bea", "dodo"]);
    const lines = headers(tree);
    expect(lines.map((header) => [header.props.name, header.props.line, header.props.count])).toEqual([["Group chats", true, 1], ["Work", true, 1]]);
    expect(lines[0]!.props.onMenu).toBeUndefined();
    expect(lines[1]!.props.onDelete).toBeUndefined();
    expect(lines[1]!.props.onMenu).toBeTypeOf("function");
    expect(labelled(tree, "Add or remove bots in Work")).toBe(false);
    expect(tree.some((node) => node.type === SidebarTileGrid)).toBe(false);
  });

  it("shows the Chief and the pinned bots as tiles above the rows, with no Pinned or Bots heading", () => {
    fixture.state = { ...fixture.state, bots: [bot("chief", { chiefOfStaff: true, pinned: true }), bot("atlas", { pinned: true }), bot("bea"), bot("dodo", { section: "Work", pinned: true })] };
    const { tree } = render();
    const grid = tree.find((node) => node.type === SidebarTileGrid)!.props as Parameters<typeof SidebarTileGrid>[0];
    expect(grid.primary?.id).toBe("chief");
    expect(grid.pinned.map((candidate) => candidate.id)).toEqual(["atlas", "dodo"]);
    expect(sectionOrder(tree)).toEqual([BOTS_SECTION_ID, CHANNELS_SECTION_ID, userSectionId("Work")]);
    expect(listedBots(tree)).toEqual(["bea"]);
    expect(headers(tree).map((header) => header.props.name)).toEqual(["Group chats", "Work"]);
  });

  it("fades the list's edges, with the top buttons and the tiles fixed above it", () => {
    fixture.state = { ...fixture.state, bots: [bot("chief", { chiefOfStaff: true, pinned: true }), bot("atlas", { pinned: true }), bot("bea")] };
    const simple = render();
    expect(simple.tree.find((node) => node.type === GlassScrollFrame)!.props.fade).toBe(true);
    const head = simple.tree.find((node) => node.type === GlassBar && node.props.edge === "top")!;
    expect(nodes(head.props.children).some((node) => node.type === SidebarTileGrid)).toBe(true);
    const list = simple.tree.find((node) => node.type === GlassScroller)!;
    expect(nodes(list.props.children).some((node) => node.type === SidebarTileGrid)).toBe(false);
    expect(simple.root.props.className).toContain("max-md:[--scroll-fade-surface:var(--color-app)]");
  });

  it("draws a faint edge and the Simple footer", () => {
    const footer = (tree: ReactElement<Props>[]) => (tree.find((node) => node.type === SidebarFooter)!.props as Parameters<typeof SidebarFooter>[0]).simple;
    const simple = render();
    expect(simple.root.props.className).toContain("border-r border-ink/[0.04]");
    expect(simple.root.props.className).not.toContain("border-hairline");
    expect(footer(simple.tree)).toBe(true);
  });

  it("still offers Add bots under an empty team", () => {
    fixture.state = { ...fixture.state, sections: ["Work", "Empty"] };
    const { tree } = render();
    expect(headers(tree).map((header) => header.props.name)).toEqual(["Group chats", "Work", "Empty"]);
    expect(labelled(tree, "Add bots to Empty")).toBe(true);
    expect(labelled(tree, "Add or remove bots in Work")).toBe(false);
  });

  it("opens the team menu from the line's ⋯ button, anchored to it, with every team action", () => {
    const work = () => headers(render().tree).find((header) => header.props.name === "Work")!;
    const button = { getBoundingClientRect: () => ({ left: 256, right: 280, top: 272, bottom: 300 }), focus: vi.fn(), isConnected: true } as unknown as HTMLButtonElement;
    expect(work().props.menuOpen).toBe(false);
    work().props.onMenu!(button);
    const { tree } = render();
    expect(work().props.menuOpen).toBe(true);
    const menu = tree.find((node) => node.type === TeamContextMenu)!.props as Parameters<typeof TeamContextMenu>[0];
    expect(menu.menu).toEqual({ name: "Work", anchor: { left: 256, right: 280, top: 272, bottom: 300 }, trigger: button });
    expect(menu.onClose).toBeTypeOf("function");
    for (const action of ["onAddBots", "onRename", "onShare", "onDelete"] as const) expect(menu[action]).toBeTypeOf("function");
  });

  it("keeps a saved order for the departments and writes a Simple move back without moving the fixed lists", () => {
    fixture.state = { ...fixture.state, sections: ["Work", "Home"] };
    const saved = [userSectionId("Home"), CHANNELS_SECTION_ID, BOTS_SECTION_ID, userSectionId("Work")];
    fixture.storage.set(SIDEBAR_SECTION_ORDER_KEY, JSON.stringify(saved));
    expect(sectionOrder(render().tree)).toEqual([BOTS_SECTION_ID, CHANNELS_SECTION_ID, userSectionId("Home"), userSectionId("Work")]);
    const work = () => headers(render().tree).find((header) => header.props.name === "Work")!;
    expect(work().props.reorderable).toBe(true);
    work().props.onMove!(-1);
    const moved = [userSectionId("Work"), CHANNELS_SECTION_ID, BOTS_SECTION_ID, userSectionId("Home")];
    expect(JSON.parse(fixture.storage.get(SIDEBAR_SECTION_ORDER_KEY)!)).toEqual(moved);
    expect(sectionOrder(render().tree)).toEqual([BOTS_SECTION_ID, CHANNELS_SECTION_ID, userSectionId("Work"), userSectionId("Home")]);
    work().props.onMove!(-1);
    expect(JSON.parse(fixture.storage.get(SIDEBAR_SECTION_ORDER_KEY)!)).toEqual(moved);
  });

  it("never hides the heading-less bots behind a collapse saved in Advanced", () => {
    fixture.storage.set(SIDEBAR_COLLAPSED_SECTIONS_KEY, JSON.stringify([BOTS_SECTION_ID, userSectionId("Work")]));
    const { tree } = render();
    expect(listedBots(tree)).toEqual(["atlas", "bea"]);
    expect(headers(tree).find((header) => header.props.name === "Work")!.props.collapsed).toBe(true);
  });

  it("keeps the search field on screen with no toggle, and clears the filter", () => {
    const pill = () => render().tree.find((node) => node.type === SidebarSearchPill)?.props as Parameters<typeof SidebarSearchPill>[0] | undefined;
    expect(pill()).toBeDefined();
    expect(render().tree.some((node) => node.props["data-sidebar-search-toggle"] !== undefined)).toBe(false);
    pill()!.onQuery("bea");
    expect(pill()!.query).toBe("bea");
    expect(listedBots(render().tree)).toEqual(["bea"]);
    pill()!.onClear();
    expect(pill()).toBeDefined();
    expect(pill()!.query).toBe("");
    expect(listedBots(render().tree)).toEqual(["atlas", "bea", "dodo"]);
  });

  it("opens at 272px and remembers its resized width", () => {
    const width = () => render().root.props.style!["--sidebar-width"];
    expect(width()).toBe("272px");
    expect(render().root.props.className).toContain("w-[272px]");
    fixture.storage.set(SIMPLE_SIDEBAR_WIDTH_KEY, "300");
    fixture.values = [];
    expect(width()).toBe("300px");
    const handle = render().tree.find((node) => node.type === SidebarResizeHandle)!.props as Parameters<typeof SidebarResizeHandle>[0];
    expect(handle.sizing.defaultWidth).toBe(272);
    expect(handle.sizing.valueNow).toBe(300);
    fixture.storage.set(SIMPLE_SIDEBAR_WIDTH_KEY, "460");
    fixture.values = [];
    expect(width()).toBe("400px");
  });
  it("collapses to a rail from the edge bump, keeping the Simple order with a hairline between sections", () => {
    const toggle = render().tree.find((node) => node.type === SidebarEdgeToggle)!.props as Parameters<typeof SidebarEdgeToggle>[0];
    expect(toggle.collapsed).toBe(false);
    toggle.onToggle();
    expect(fixture.storage.get(SIDEBAR_DENSITY_KEY)).toBe("icons");
    const { root, tree } = render();
    expect(root.props.className).toContain("w-[92px]");
    expect(sectionOrder(tree)).toEqual([BOTS_SECTION_ID, CHANNELS_SECTION_ID, userSectionId("Work")]);
    expect(listedBots(tree)).toEqual(["atlas", "bea", "dodo"]);
    expect(headers(tree)).toEqual([]);
    expect(tree.filter((node) => node.type === SidebarRailSeparator)).toHaveLength(2);
    expect(tree.some((node) => node.props["data-sidebar-search-toggle"] !== undefined)).toBe(false);
    expect((tree.find((node) => node.type === SidebarEdgeToggle)!.props as Parameters<typeof SidebarEdgeToggle>[0]).collapsed).toBe(true);
    expect(tree.some((node) => node.props["data-sidebar-top-buttons"] !== undefined)).toBe(false);
  });

  it("puts round search and the same + menu at the top of the rail, and the edge bump expands it again", () => {
    setSidebarDensity("icons");
    const top = () => render().tree.find((node) => node.props["data-sidebar-rail-top"] !== undefined)!;
    const plus = () => nodes(top().props.children).find((node) => node.type === "button" && node.props["aria-label"] === "New or share")!;
    expect(plus().props.className).toEqual(expect.stringContaining("size-9"));
    (plus().props.onClick as () => void)();
    const menu = nodes(top().props.children).find((node) => /\bmin-w-\[198px\]/.test(node.props.className ?? ""))!;
    expect(menu.props.className).toEqual(expect.stringContaining("left-full top-0"));
    expect(menu.props.className).toEqual(expect.stringContaining("rounded-[var(--radius-menu)]"));
    const item = (label: string) => nodes(top().props.children).find((node) => node.type === "button" && nodes(node.props.children).concat(node).some((part) => Children.toArray(part.props.children).includes(label)));
    expect(item("Create department")).toBeDefined();
    expect(item("New chat"), "a new conversation starts from the bot panel").toBeUndefined();
    expect(item("New bot")).toBeDefined();
    expect(item("New group chat")).toBeDefined();
    expect(item("Templates"), "Templates lives in the desktop footer, not the + menu").toBeUndefined();
    (render().tree.find((node) => node.type === SidebarEdgeToggle)!.props as Parameters<typeof SidebarEdgeToggle>[0]).onToggle();
    expect(fixture.storage.get(SIDEBAR_DENSITY_KEY)).toBe("expanded");
    expect(render().tree.some((node) => node.type === SimpleRailFooter)).toBe(false);
  });

  it("New Bot makes a bot at once, Create department is offered and Templates stays in the footer", () => {
    fixture.state = { ...fixture.state, bots: [bot("atlas", { chiefOfStaff: true }), bot("bea")] };
    const openMenu = () => {
      const plus = () => render().tree.find((node) => node.type === "button" && node.props["aria-label"] === "New or share")!;
      (plus().props.onClick as () => void)();
      const tree = render().tree;
      return (label: string) => tree.find((node) => node.type === "button" && nodes(node.props.children).concat(node).some((part) => Children.toArray(part.props.children).includes(label)));
    };
    (openMenu()("New bot")!.props.onClick as () => void)();
    expect(fixture.dispatch.mock.calls.map(([action]) => action)).toEqual([{ type: "newBot" }]);
    fixture.dispatch.mockClear();
    fixture.values = [];
    const item = openMenu();
    expect(item("Create department")).toBeDefined();
    expect(item("Templates")).toBeUndefined();
  });

  const railSearch = (tree: ReactElement<Props>[]) => tree.find((node) => node.type === "button" && node.props["aria-label"] === "Search bots and messages")!.props.onClick as () => void;

  it("opens the search pill from the rail's search button by expanding the sidebar", () => {
    setSidebarDensity("icons");
    expect(render().tree.some((node) => node.type === SidebarSearchPill)).toBe(false);
    railSearch(render().tree)();
    expect(fixture.storage.get(SIDEBAR_DENSITY_KEY)).toBe("expanded");
  });

  it("keeps the search button out of the way when a side panel holds the sidebar collapsed", () => {
    const tree = render(true).tree;
    expect(tree.some((node) => node.type === SidebarEdgeToggle)).toBe(false);
    expect(tree.some((node) => node.type === "button" && node.props["aria-label"] === "Search bots and messages")).toBe(false);
    expect(tree.some((node) => node.type === SimpleRailFooter)).toBe(true);
  });
});

describe("the footer's places", () => {
  const footer = (tree: ReactElement<Props>[]) => tree.find((node) => node.type === SidebarFooter)!;
  const places = (tree: ReactElement<Props>[]) => footer(tree).props.places as NonNullable<Parameters<typeof SidebarFooter>[0]["places"]>;

  it("offers Team map and Templates from the Simple footer and opens each", () => {
    const shared = places(render().tree);
    expect(shared).toMatchObject({ teamMapOpen: false, templatesOpen: false });
    shared.onOpenTeamMap!();
    expect(fixture.dispatch).toHaveBeenCalledWith({ type: "showTeamMap" });
    fixture.dispatch.mockClear();
    shared.onOpenTemplates!();
    expect(render().tree.some((node) => node.type === TeamLibraryPanel)).toBe(true);
  });

  it("keeps Templates and Team map out of the + menu", () => {
    {
      fixture.values = [];
      const plus = render().tree.find((node) => node.type === "button" && node.props["aria-label"] === "New or share")!;
      (plus.props.onClick as () => void)();
      const labels = nodes(render().tree.find((node) => node.props.role === "menu")!.props.children)
        .filter((node) => node.type === "button")
        .map((node) => Children.toArray(node.props.children).filter((part) => typeof part === "string"));
      expect(labels.flat()).not.toContain("Templates");
      expect(labels.flat()).not.toContain("Team map");
    }
  });
});
