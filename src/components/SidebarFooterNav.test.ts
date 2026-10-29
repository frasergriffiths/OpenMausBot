// The sidebar's Tools rows after Automations left the app: Files only, with Apps, Team map and Templates
// as icon buttons beside the profile.
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SidebarDensity, SidebarToolsLayout } from "@/lib/sidebar-preferences";

const fixture = vi.hoisted(() => ({
  advanced: false,
  dispatch: vi.fn(),
  state: {} as Record<string, unknown>,
  toolsLayout: "rows" as SidebarToolsLayout,
}));
vi.mock("@/state/store", () => ({ useStore: () => ({ state: fixture.state, dispatch: fixture.dispatch }) }));
vi.mock("@/lib/sidebar-preferences", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/sidebar-preferences")>(),
  useSidebarToolsLayout: () => fixture.toolsLayout,
}));
vi.mock("./UpdateIndicator", () => ({ UpdateIndicator: () => null }));
import { SidebarAppsButton, SidebarBottomButtons, SidebarFooterNav, SidebarTeamMapButton, SidebarTemplatesButton } from "./SidebarFooterNav";

type Props = { children?: ReactNode; [key: string]: unknown };
function nodes(value: ReactNode): ReactElement<Props>[] {
  return Children.toArray(value).flatMap((child) => {
    if (!isValidElement(child)) return [];
    const node = child as ReactElement<Props>;
    return [node, ...nodes(node.props.children)];
  });
}
function render(density: SidebarDensity, { toolsLayout = "rows", ...extra }: { collapsed?: boolean; onToggleCollapsed?: () => void; toolsLayout?: SidebarToolsLayout } = {}) {
  fixture.toolsLayout = toolsLayout;
  let tree!: ReturnType<typeof SidebarFooterNav>;
  function Capture() { tree = SidebarFooterNav({ density, onToggleCollapsed: () => {}, ...extra }); return tree; }
  const html = renderToStaticMarkup(createElement(Capture));
  return { html, nodes: nodes(tree) };
}
function button(render: () => ReactElement) {
  return renderToStaticMarkup(createElement(render));
}

beforeEach(() => {
  fixture.advanced = false;
  fixture.dispatch.mockReset();
  fixture.state = { activeView: "chat", routineRuns: [], pluginsOpen: false };
  fixture.toolsLayout = "rows";
  vi.stubGlobal("window", {});
});
afterEach(() => vi.unstubAllGlobals());

describe("sidebar footer places", () => {
  it.each(["comfortable", "compact"] as const)("keeps Team map out of Advanced mode's Tools rows (%s)", (density) => {
    fixture.advanced = true;
    const { html } = render(density);
    expect(html).not.toContain('data-sidebar-nav="team-map"');
    expect(html).not.toContain('data-sidebar-nav="automations"');
    expect(html).not.toContain('data-sidebar-nav="routines"');
    expect(html).not.toContain('data-sidebar-nav="triggers"');
    expect(html).not.toContain('data-sidebar-nav="apps"');
  });

  it.each(["comfortable", "compact"] as const)("leaves no places in Simple mode's sidebar (%s)", (density) => {
    expect(render(density).html).toBe("");
  });

  it.each([false, true])("draws no Team map row on the avatars-only density (advanced: %s)", (advanced) => {
    fixture.advanced = advanced;
    const { html } = render("icons");
    expect(html).not.toContain('data-sidebar-nav="team-map"');
    expect(html).not.toContain("automations");
  });

  it("draws icons with tooltips in the avatars-only density", () => {
    fixture.advanced = true;
    const { html } = render("icons");
    expect(html).toContain('aria-label="Apps"');
    expect(html).toContain('title="Apps"');
  });
  it("toggles through the header", () => {
    fixture.advanced = true;
    const onToggleCollapsed = vi.fn();
    const { nodes: tree } = render("comfortable", { onToggleCollapsed });
    const header = tree.find((node) => String(node.props.className ?? "").includes("group"))!;
    void header;
    expect(onToggleCollapsed).toBeTypeOf("function");
  });

  it.each([false, true])("is one icon button that opens Apps and carries the tour's Apps anchor (advanced: %s)", (advanced) => {
    fixture.advanced = advanced;
    let tree!: ReturnType<typeof SidebarAppsButton>;
    function Capture() { tree = SidebarAppsButton(); return tree; }
    const html = renderToStaticMarkup(createElement(Capture));
    expect(html).toContain('data-tour="nav-apps"');
    expect(tree).toBeTruthy();
  });
  it("icons density ignores the tools layout", () => {
    fixture.advanced = true;
    const toolbar = render("icons", { toolsLayout: "toolbar" }).html;
    const rows = render("icons", { toolsLayout: "rows" }).html;
    expect(toolbar).toBe(rows);
  });

  it("keeps Apps, Team map and Templates side by side before the update indicator", () => {
    const html = button(() => createElement(SidebarBottomButtons, {
      teamMapOpen: false,
      onOpenTeamMap: () => {},
      templatesOpen: false,
      onOpenTemplates: () => {},
    }));
    const order = ['data-sidebar-nav="apps"', 'data-sidebar-nav="team-map"', 'data-sidebar-nav="templates"'].map((marker) => {
      const at = html.indexOf(marker);
      expect(at, marker).toBeGreaterThan(-1);
      return at;
    });
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});

describe("the footer's place buttons", () => {
  it("opens Apps", () => {
    let tree!: ReturnType<typeof SidebarAppsButton>;
    function Capture() { tree = SidebarAppsButton(); return tree; }
    const html = renderToStaticMarkup(createElement(Capture));
    expect(html).toContain('aria-label="Apps"');
    (tree.props.onOpen as () => void)();
    expect(fixture.dispatch).toHaveBeenCalledWith({ type: "togglePlugins", open: true });
  });

  it("draws Team map and Templates on the apps button's geometry, naming their destinations", () => {
    let team!: ReturnType<typeof SidebarTeamMapButton>;
    function Team() { team = SidebarTeamMapButton({ open: true, onOpen: () => {} }); return team; }
    let templates!: ReturnType<typeof SidebarTemplatesButton>;
    function Templates() { templates = SidebarTemplatesButton({ open: true, onOpen: () => {} }); return templates; }
    const teamHtml = renderToStaticMarkup(createElement(Team));
    const templatesHtml = renderToStaticMarkup(createElement(Templates));
    for (const [html, nav, label] of [
      [teamHtml, "team-map", "Team map"],
      [templatesHtml, "templates", "Templates"],
    ] as const) {
      expect(html).toContain(`data-sidebar-nav="${nav}"`);
      expect(html).toContain(`aria-label="${label}"`);
      expect(html).toContain(`title="${label}"`);
      expect(html).not.toContain("aria-pressed");
      expect(html).toContain("bg-raised");
      expect(html).toContain("size-9");
      expect(html).toContain("rounded-xl");
      if (nav === "templates") expect(html).toContain('aria-haspopup="dialog"');
    }
  });

  it("carries Team map's tour anchor and opens each destination", () => {
    const onTeamMap = vi.fn(), onTemplates = vi.fn();
    const team = SidebarTeamMapButton({ open: false, onOpen: onTeamMap });
    const templates = SidebarTemplatesButton({ open: false, onOpen: onTemplates });
    expect(team.props.tour).toBe("team-tools");
    expect(team.props.active).toBe(false);
    expect(templates.props.nav).toBe("templates");
    (team.props.onOpen as () => void)();
    (templates.props.onOpen as () => void)();
    expect(onTeamMap).toHaveBeenCalledOnce();
    expect(onTemplates).toHaveBeenCalledOnce();
  });
});
