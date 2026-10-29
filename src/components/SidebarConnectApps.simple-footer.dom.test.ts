// @vitest-environment happy-dom
// The connect-apps prompt is its own row above the Simple footer's three-squircle cluster. Dismissing it must leave the
// footer Apps squircle focused and reachable; the PluginsPanel control brings the row back.
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dismissConnectAppsPill, restoreConnectAppsPill } from "@/lib/connect-apps-pill";

const fixture = vi.hoisted(() => ({
  inventory: { services: { gmail: { connected: true } } as Record<string, { connected: boolean }>, authoritative: true },
  catalogue: { cards: new Map<string, unknown>(), slugs: ["gmail", "slack"] as string[], complete: true },
  native: [] as Array<{ slug: string; connected: boolean }>,
  pluginsOpen: false,
  dispatch: vi.fn(),
}));

vi.mock("@/state/store", () => ({
  useStore: () => ({ state: { pluginsOpen: fixture.pluginsOpen, activeView: "chat" }, dispatch: fixture.dispatch }),
}));
vi.mock("./CloudUsageMeter", () => ({ CloudUsageCard: () => null }));
vi.mock("./DesktopWorkspaceSwitcher", () => ({ endCloudHowTo: vi.fn(), useWorkspacePlace: () => ({ error: null, waking: null }) }));
vi.mock("./SidebarProfileMenu", () => ({ SidebarProfileMenu: () => null, useSimpleAccount: () => ({}) }));
vi.mock("./UpdateIndicator", () => ({ UpdateIndicator: () => null }));
vi.mock("./SidebarPhoneButton", () => ({ SidebarPhoneButton: () => null, phoneSettingsAction: () => ({ type: "phone-settings" }) }));
vi.mock("./PluginsPanel", () => ({ preloadConnectedApps: () => Promise.resolve(fixture.inventory) }));
vi.mock("./bot-settings/useBotApps", () => ({ loadAppCatalogue: () => Promise.resolve(fixture.catalogue) }));
vi.mock("@/lib/native-app-connections", () => ({ loadNativeAppConnections: () => Promise.resolve(fixture.native) }));

const { SidebarFooter } = await import("./SidebarFooter");
const { SimpleRailFooter } = await import("./SidebarSimpleRail");
const { ConnectAppsPillRestore } = await import("./ConnectAppsPillRestore");

let host: HTMLDivElement;
let root: Root;

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => { values.clear(); },
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => { values.delete(key); },
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
  };
}

const storage = memoryStorage();

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
  storage.clear();
  fixture.inventory = { services: { gmail: { connected: true } }, authoritative: true };
  fixture.catalogue = { cards: new Map(), slugs: ["gmail", "slack"], complete: true };
  fixture.native = [];
  fixture.pluginsOpen = false;
  fixture.dispatch.mockClear();
  restoreConnectAppsPill();
});

afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
  restoreConnectAppsPill();
});

const settle = async () => {
  for (let i = 0; i < 8; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

const row = () => host.querySelector<HTMLElement>("[data-connect-apps-pill]");
const dismiss = () => host.querySelector<HTMLElement>("[data-connect-apps-dismiss]");
const apps = () => host.querySelector<HTMLElement>('[data-sidebar-footer="simple"] [data-sidebar-nav="apps"]');

function renderFooter() {
  flushSync(() => root.render(createElement(SidebarFooter, { density: "compact", simple: true, owner: null, toolsCollapsed: false })));
}

describe("the connect-apps prompt in the shipping Simple footer", () => {
  it("sits in its own row above three 36px squircles, with no app faces in the cluster", async () => {
    renderFooter();
    await settle();
    expect(row()).not.toBeNull();
    expect(dismiss()).not.toBeNull();
    expect(dismiss()!.className).toContain("size-6");

    const cluster = row()!.nextElementSibling!;
    for (const nav of ["apps", "team-map", "templates"]) {
      const button = cluster.querySelector<HTMLElement>(`[data-sidebar-nav="${nav}"]`)!;
      expect(button).not.toBeNull();
      expect(button.className).toContain("size-9");
    }
    expect(apps()!.querySelector("[data-app-face]")).toBeNull();
    expect(apps()!.textContent?.trim()).toBe("");
    expect(apps()!.querySelector(".lucide-puzzle")).not.toBeNull();
  });

  it("hides the row on dismiss, keeps the Apps squircle and puts focus on it, not on the body", async () => {
    renderFooter();
    await settle();
    flushSync(() => dismiss()!.click());
    await settle();
    expect(row()).toBeNull();
    expect(apps()).not.toBeNull();
    expect(document.activeElement).toBe(apps());
  });

  it("renders no prompt on a mount that starts dismissed, but keeps the Apps squircle", async () => {
    dismissConnectAppsPill();
    renderFooter();
    await settle();
    expect(row()).toBeNull();
    expect(apps()).not.toBeNull();
  });

  it("brings the row back from the PluginsPanel control", async () => {
    flushSync(() => root.render(createElement("div", null,
      createElement(SidebarFooter, { density: "compact", simple: true, owner: null, toolsCollapsed: false }),
      createElement(ConnectAppsPillRestore),
    )));
    await settle();
    flushSync(() => dismiss()!.click());
    await settle();
    expect(row()).toBeNull();

    const restore = host.querySelector<HTMLElement>("[data-show-connect-apps]")!;
    expect(restore).not.toBeNull();
    flushSync(() => restore.click());
    await settle();
    expect(row()).not.toBeNull();
  });
});

describe("the Simple rail", () => {
  it("keeps the Apps squircle as the only entry and never mounts the prompt row", async () => {
    flushSync(() => root.render(createElement(SimpleRailFooter, { owner: null })));
    await settle();
    expect(row()).toBeNull();
    const entry = host.querySelector<HTMLElement>('[data-sidebar-rail-footer] [data-sidebar-nav="apps"]')!;
    expect(entry).not.toBeNull();
    expect(entry.className).toContain("size-9");
    expect(entry.className).toContain("rounded-xl");
    expect(entry.querySelector("[data-app-face]")).toBeNull();
    flushSync(() => entry.click());
    expect(fixture.dispatch).toHaveBeenCalledWith({ type: "togglePlugins", open: true });
  });
});
