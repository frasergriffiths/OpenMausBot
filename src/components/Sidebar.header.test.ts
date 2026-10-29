import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initialDesktopCapabilities } from "@/lib/desktop";
import { setLocale } from "@/lib/i18n";
import type { SidebarDensity } from "@/lib/sidebar-preferences";
import { StoreProvider } from "@/state/store";

const fixture = vi.hoisted(() => ({
  density: "comfortable" as SidebarDensity,
  windowChrome: undefined as "mac-inset" | "win-caption" | "native" | undefined,
  hostLabel: undefined as string | undefined,
}));

vi.mock("@/lib/sidebar-preferences", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/sidebar-preferences")>(),
  useSidebarDensity: () => fixture.density,
}));
vi.mock("./DesktopCapabilities", async (importOriginal) => ({
  ...await importOriginal<typeof import("./DesktopCapabilities")>(),
  useDesktopCapabilities: () => {
    const capabilities = initialDesktopCapabilities();
    const host = { ...capabilities.host, label: fixture.hostLabel ?? capabilities.host.label };
    return { capabilities: { ...capabilities, host, windowChrome: fixture.windowChrome }, ready: true };
  },
}));

import { MAC_TRAFFIC_LIGHT_CENTER_Y, Sidebar } from "./Sidebar";

const render = () => renderToStaticMarkup(
  createElement(StoreProvider, null, createElement(Sidebar, { open: true, onClose: () => {} })),
);

beforeEach(() => {
  fixture.density = "comfortable";
  fixture.windowChrome = undefined;
  fixture.hostLabel = undefined;
  vi.stubGlobal("window", { innerWidth: 1280, location: { protocol: "http:", search: "" } });
  setLocale("en");
});

afterEach(() => {
  vi.unstubAllGlobals();
  setLocale("en");
});

describe("sidebar header", () => {
  it.each(["comfortable", "compact", "icons"] as const)(
    "keeps collapse and add but no density menu at %s density in Simple mode",
    (density) => {
      fixture.density = density;
      const html = render();
      expect(html).toContain(density === "icons" ? 'aria-label="Expand sidebar"' : 'aria-label="Collapse sidebar to avatars"');
      expect(html).not.toContain('aria-label="Active Threads"');
      expect(html).toContain('aria-label="New or share"');
      expect(html).not.toContain("Choose sidebar density");
      expect(html).not.toContain('title="Sidebar density"');
    },
  );

  it.each(["comfortable", "compact"] as const)("keeps collapse and add but no activity menu in Simple mode at %s density", (density) => {
    fixture.density = density;
    const html = render();
    expect(html).toContain('aria-label="Collapse sidebar to avatars"');
    expect(html).not.toContain('aria-label="Active Threads"');
    expect(html).toContain('aria-label="New or share"');
  });

  it("still offers Expand on an icons rail in Simple mode, so the rail is never a dead end", () => {
    fixture.density = "icons";
    const html = render();
    expect(html).toContain('aria-label="Expand sidebar"');
    expect(html).not.toContain('aria-label="Active Threads"');
  });
});

describe("sidebar top row", () => {
  const desktop = () => vi.stubGlobal("window", {
    innerWidth: 1280,
    location: { protocol: "http:", search: "" },
    ogb: { workspaces: { state: () => new Promise(() => {}), menu: () => Promise.resolve() } },
  });
  const topRow = (html: string) => {
    const start = html.indexOf("data-sidebar-top-row");
    const end = html.indexOf('aria-label="New or share"');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return html.slice(start, end);
  };
  const classesOf = (html: string, attribute: string) => {
    const match = new RegExp(`${attribute}(?:="[^"]*")? class="([^"]*)"`).exec(html);
    expect(match, attribute).not.toBeNull();
    return match![1].split(" ");
  };
  const order = (row: string) => ({
    lights: row.indexOf("data-traffic-light-space"),
    slot: row.indexOf("data-sidebar-top-slot"),
    spacer: row.indexOf("data-sidebar-top-spacer"),
    switcher: row.indexOf('data-workspace-switcher="inline"'),
    buttons: row.indexOf("data-sidebar-top-buttons"),
  });

  it("puts the lights, the server switcher and one + on one 60px macOS row in Simple mode at compact density", () => {
    fixture.density = "compact";
    fixture.windowChrome = "mac-inset";
    desktop();
    const html = render();
    const row = topRow(html);
    expect(MAC_TRAFFIC_LIGHT_CENTER_Y).toBe(23);
    expect(row).toMatch(/^data-sidebar-top-row="true" class="[^"]*\bh-\[60px\][^"]*\bitems-center\b[^"]*" style="-webkit-app-region:drag"/);
    const { lights, slot, spacer, switcher, buttons } = order(row);
    expect(lights).toBeGreaterThan(-1);
    expect(slot).toBeGreaterThan(lights);
    expect(spacer).toBe(-1);
    expect(switcher).toBeGreaterThan(slot);
    expect(buttons).toBeGreaterThan(switcher);
    expect(row.slice(buttons).match(/<button/g)).toHaveLength(1);
    expect(classesOf(row, "data-sidebar-top-row")).toEqual(expect.arrayContaining(["relative", "h-[60px]", "pl-4", "pr-4"]));
    expect(classesOf(row, "data-sidebar-top-slot")).toEqual(expect.arrayContaining(["@container/sidebar-top", "min-w-0", "flex-1"]));
    expect(html.match(/Switch server:/g)).toHaveLength(1);
    expect(html).toContain('title="New or share"');
  });

  it("in Simple mode puts the computer pill between the traffic lights and a round + on the right of a 60px macOS row, and the collapse bump on the edge until hover", () => {
    fixture.windowChrome = "mac-inset";
    desktop();
    const html = render();
    const row = topRow(html);
    expect(row).toMatch(/^data-sidebar-top-row="true" class="[^"]*\bh-\[60px\][^"]*\bitems-center\b[^"]*" style="-webkit-app-region:drag"/);
    expect(classesOf(row, "data-sidebar-top-row")).toEqual(expect.arrayContaining(["pl-4", "pr-4", "items-center"]));
    expect(row).toContain("data-workspace-switcher");
    expect(row).toMatch(/aria-label="Switch server: Servers"[^>]*class="[^"]*\bh-9\b[^"]*\brounded-full\b/);
    expect(html.match(/Switch server:/g)).toHaveLength(1);
    const { lights, slot, buttons } = order(row);
    expect(lights).toBeGreaterThan(-1);
    expect(slot).toBeGreaterThan(lights);
    expect(buttons).toBeGreaterThan(slot);
    expect(classesOf(row, "data-sidebar-top-buttons")).toEqual(expect.arrayContaining(["shrink-0", "gap-2"]));
    expect(row.slice(buttons).match(/<button/g)).toHaveLength(1);
    expect(classesOf(row, "data-sidebar-top-slot")).toEqual(expect.arrayContaining(["@container/sidebar-top", "min-w-0", "flex-1"]));
    expect(row).not.toContain("data-sidebar-search-toggle");
    expect(html).toMatch(/aria-label="New or share" class="[^"]*\bsize-9\b[^"]*\brounded-full\b/);
    expect(html).toMatch(/data-sidebar-edge-toggle="true" aria-label="Collapse sidebar to avatars" aria-expanded="true" title="Collapse to avatars" style="-webkit-app-region:no-drag" class="[^"]*\babsolute\b[^"]*\bpointer-events-none opacity-0\b[^"]*\btouch:pointer-events-auto touch:opacity-100\b[^"]*\btop-\[14px\]/);
    expect(html).not.toContain('title="Active Threads"');
    expect(html).toContain("data-sidebar-search-pill");
  });

  it.each([["win-caption", "Windows"], ["native", "Linux"]] as const)(
    "keeps the same right-aligned order without traffic lights (%s)",
    (windowChrome, hostLabel) => {
      fixture.windowChrome = windowChrome;
      fixture.hostLabel = hostLabel;
      desktop();
      const html = render();
      const row = topRow(html);
      expect(row).not.toContain("data-traffic-light-space");
      expect(row).not.toContain("bg-[#ff5f57]");
      expect(classesOf(row, "data-sidebar-top-row")).toEqual(expect.arrayContaining(["relative", "h-[60px]", "pl-4", "pr-4"]));
      const { slot, spacer, switcher, buttons } = order(row);
      expect(slot).toBeGreaterThan(-1);
      expect(spacer).toBe(-1);
      expect(switcher).toBeGreaterThan(slot);
      expect(buttons).toBeGreaterThan(switcher);
      expect(html.match(/Switch server:/g)).toHaveLength(1);
    },
  );

  it("keeps the browser build's placeholder lights 12px clear of the buttons", () => {
    const row = topRow(render());
    expect(row).toContain('<div class="flex shrink-0 items-center gap-2 mr-3 mt-1"><span class="size-3 rounded-full bg-[#ff5f57]"></span>');
    const { spacer, buttons } = order(row);
    expect(spacer).toBe(-1);
    expect(buttons).toBeGreaterThan(row.indexOf("bg-[#28c840]"));
  });

  it("collapses Simple mode to a rail: the lights, then round search and + on top, the expand bump on the edge, and Apps and the account at the foot", () => {
    fixture.density = "icons";
    fixture.windowChrome = "mac-inset";
    desktop();
    const html = render();
    const top = html.slice(html.indexOf("data-sidebar-top-row"), html.indexOf("data-sidebar-rail-footer"));
    expect(top).toContain("data-traffic-light-space");
    expect(top).not.toContain("data-sidebar-top-buttons");
    expect(top).not.toContain("data-workspace-switcher");
    expect(top.indexOf("data-traffic-light-space")).toBeLessThan(top.indexOf('aria-label="Search bots and messages"'));
    expect(top.indexOf('aria-label="Search bots and messages"')).toBeLessThan(top.indexOf('aria-label="New or share"'));
    expect(top).toMatch(/data-sidebar-rail-top="true" class="flex flex-col items-center gap-2 pt-1"/);
    expect(top).toMatch(/aria-label="New or share" class="[^"]*\bsize-9\b[^"]*\brounded-full\b/);
    const foot = html.slice(html.indexOf("data-sidebar-rail-footer"));
    const at = (marker: string) => {
      const index = foot.indexOf(marker);
      expect(index, marker).toBeGreaterThan(-1);
      return index;
    };
    expect(html).toMatch(/data-sidebar-edge-toggle="true" aria-label="Expand sidebar" aria-expanded="false"[^>]*class="[^"]*\bopacity-100\b[^"]*"><svg[^>]*lucide-chevron-right/);
    expect(foot).not.toContain('aria-label="Expand sidebar"');
    expect(foot).not.toContain('aria-label="Search bots and messages"');
    const positions = [
      at('data-sidebar-nav="apps"'),
      at('data-sidebar-nav="team-map"'),
      at('data-sidebar-nav="templates"'),
      at("data-sidebar-account"),
    ];
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(foot).toMatch(/data-tour="nav-apps" data-sidebar-nav="apps"[^>]*aria-label="Apps"[^>]*class="[^"]*\bsize-9\b[^"]*"><svg[^>]*lucide-puzzle/);
    expect(foot).not.toContain("data-workspace-switcher");
    expect(foot).not.toContain('data-sidebar-nav="automations"');
    expect(html).not.toContain("Switch server:");
    expect(html.match(/aria-label="New or share"/g)).toHaveLength(1);
  });

  it("stacks the Simple icons rail and keeps the icon-only switcher beneath it", () => {
    fixture.density = "icons";
    fixture.windowChrome = "mac-inset";
    desktop();
    const html = render();
    const row = topRow(html);
    expect(row).not.toContain("data-workspace-switcher");
    expect(row).not.toContain("data-sidebar-top-spacer");
    expect(classesOf(row, "data-sidebar-top-row")).toEqual(["flex", "items-center", "flex-col", "gap-1", "px-2", "pt-3.5", "pb-1"]);
    expect(classesOf(row, "data-traffic-light-space")).toEqual(["h-5", "w-full"]);
    expect(row).not.toContain("data-sidebar-top-buttons");
    expect(html).toContain("data-sidebar-rail-top");
    expect(html).toContain("data-sidebar-rail-footer");
  });
});

describe("sidebar glass head and foot", () => {
  it.each(["comfortable", "compact", "icons"] as const)(
    "puts the top row and search in the glass head, the places in the glass foot, and the list between at %s density",
    (density) => {
      fixture.density = density;
      const html = render();
      const at = (marker: string) => {
        const index = html.indexOf(marker);
        expect(index, marker).toBeGreaterThan(-1);
        return index;
      };
      const head = at('data-glass-bar="top"');
      const topRow = at("data-sidebar-top-row");
      const search = at('aria-label="Search bots and messages"');
      const list = at('data-scroll-fade-frame=""');
      const foot = at('data-glass-bar="bottom"');
      const places = at('data-sidebar-nav="apps"');
      expect(head).toBeLessThan(topRow);
      expect(topRow).toBeLessThan(search);
      expect(search).toBeLessThan(list);
      expect(list).toBeLessThan(foot);
      expect(foot).toBeLessThan(places);
      expect(html).not.toContain('data-sidebar-nav="automations"');
      expect(html.match(/data-glass-frame=""/g)).toHaveLength(1);
      expect(at("data-glass-frame")).toBeLessThan(head);
    },
  );
});

describe("sidebar foot in Simple mode", () => {
  it.each(["comfortable", "compact"] as const)("puts the account avatar, Apps, Team map and Templates in the foot, with Files and Archived in the account menu (%s)", (density) => {
    fixture.density = density;
    const html = render();
    const foot = html.slice(html.indexOf('data-glass-bar="bottom"'));
    expect(foot).toContain('data-sidebar-footer="simple"');
    expect(html).not.toContain('data-sidebar-nav="automations"');
    expect(html.match(/data-sidebar-nav="apps"/g)).toHaveLength(1);
    expect(foot.indexOf("data-sidebar-account")).toBeGreaterThan(-1);
    expect(foot.indexOf("data-sidebar-account")).toBeLessThan(foot.indexOf('data-sidebar-nav="apps"'));
    expect(foot.indexOf('data-sidebar-nav="apps"')).toBeLessThan(foot.indexOf('data-sidebar-nav="team-map"'));
    expect(foot.indexOf('data-sidebar-nav="team-map"')).toBeLessThan(foot.indexOf('data-sidebar-nav="templates"'));
    expect(foot).toMatch(/data-tour="nav-apps" data-sidebar-nav="apps"[^>]*aria-label="Apps"[^>]*><svg[^>]*lucide-puzzle/);
    const account = foot.slice(foot.indexOf("data-sidebar-account"), foot.indexOf('data-sidebar-nav="apps"'));
    expect(account).toContain("min-h-9");
    expect(account).toContain("text-[13px]");
    expect(account).toContain("width:24px");
    expect(account).toContain("height:24px");
    expect(account).not.toContain("min-h-[46px]");
  });

  it("keeps no Automations or Routines row in Simple mode, and still one Apps", () => {
    const html = render();
    expect(html).not.toContain('data-sidebar-nav="routines"');
    expect(html).not.toContain('data-sidebar-nav="automations"');
    expect(html.match(/data-sidebar-nav="apps"/g)).toHaveLength(1);
  });
});
