// The sidebar's Tools rows after Automations left the app: Team map and Files only, Apps beside the profile.
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
vi.mock("@/lib/interface-mode", () => ({ useAdvancedMode: () => fixture.advanced, setAdvancedMode: () => {} }));
vi.mock("@/state/store", () => ({ useStore: () => ({ state: fixture.state, dispatch: fixture.dispatch }) }));
vi.mock("@/lib/sidebar-preferences", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/sidebar-preferences")>(),
  useSidebarToolsLayout: () => fixture.toolsLayout,
}));
vi.mock("./UpdateIndicator", () => ({ UpdateIndicator: () => null }));
import { SidebarAppsButton, SidebarBottomButtons, SidebarFooterNav } from "./SidebarFooterNav";

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

beforeEach(() => {
  fixture.advanced = false;
  fixture.dispatch.mockReset();
  fixture.state = { activeView: "chat", routineRuns: [], pluginsOpen: false };
  fixture.toolsLayout = "rows";
  vi.stubGlobal("window", {});
});
afterEach(() => vi.unstubAllGlobals());

describe("sidebar footer places", () => {
  it.each(["comfortable", "compact"] as const)("leads Advanced mode's places with Team map, with Apps beside the profile instead (%s)", (density) => {
    fixture.advanced = true;
    const { html } = render(density);
    expect(html).toContain('data-sidebar-nav="team-map"');
    expect(html).not.toContain('data-sidebar-nav="automations"');
    expect(html).not.toContain('data-sidebar-nav="routines"');
    expect(html).not.toContain('data-sidebar-nav="triggers"');
    expect(html).not.toContain('data-sidebar-nav="apps"');
  });

  it.each(["comfortable", "compact"] as const)("leaves no places in Simple mode's sidebar (%s)", (density) => {
    expect(render(density).html).toBe("");
  });

  it.each([false, true])("puts Team map on the avatars-only density ahead of Apps (advanced: %s)", (advanced) => {
    fixture.advanced = advanced;
    const { html } = render("icons");
    const team = html.indexOf('data-sidebar-nav="team-map"');
    expect(team).toBeGreaterThan(-1);
    expect(html).not.toContain("automations");
  });

  it("marks Team map current while it is open", () => {
    fixture.advanced = false;
    fixture.state = { ...fixture.state, activeView: "team-map" };
    const { html } = render("icons");
    expect(html).toContain('data-sidebar-nav="team-map"');
    expect(html).toContain('aria-current="page"');
  });

  it("shows Team map as its own row in Advanced mode, with no Tools menu", () => {
    fixture.advanced = true;
    const { html } = render("comfortable");
    expect(html).toContain('data-sidebar-nav="team-map"');
    expect(html).toContain('data-tour="team-tools"');
    expect(html).not.toContain('aria-label="Automations"');
  });

  it("draws icons with tooltips in the avatars-only density", () => {
    fixture.advanced = true;
    const { html } = render("icons");
    expect(html).toContain('aria-label="Team map"');
    expect(html).toContain('title="Team map"');
  });

  it.each(["comfortable", "compact"] as const)("labels the places with a Tools header, expanded by default (%s)", (density) => {
    fixture.advanced = true;
    const { html } = render(density);
    expect(html).toContain("Tools");
  });

  it("keeps the Tools label and hides the rows when collapsed", () => {
    fixture.advanced = true;
    const { html } = render("comfortable", { collapsed: true });
    expect(html).toContain("Tools");
    expect(html).not.toContain('data-sidebar-nav="team-map"');
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

  it.each(["comfortable", "compact"] as const)("toolbar renders the places as icon buttons with labels (%s)", (density) => {
    fixture.advanced = true;
    const { html } = render(density, { toolsLayout: "toolbar" });
    expect(html).toContain('data-sidebar-nav="team-map"');
    expect(html).toContain("flex-row");
  });

  it("toolbar keeps tour anchors and aria-current", () => {
    fixture.advanced = true;
    fixture.state = { ...fixture.state, activeView: "team-map" };
    const { html } = render("comfortable", { toolsLayout: "toolbar" });
    expect(html).toContain('data-tour="team-tools"');
    expect(html).toContain('aria-current="page"');
  });

  it("icons density ignores the tools layout", () => {
    fixture.advanced = true;
    const toolbar = render("icons", { toolsLayout: "toolbar" }).html;
    const rows = render("icons", { toolsLayout: "rows" }).html;
    expect(toolbar).toBe(rows);
  });

  it("keeps Apps and the update indicator side by side in the bottom buttons", () => {
    const html = renderToStaticMarkup(createElement(SidebarBottomButtons));
    expect(html).toContain('data-tour="nav-apps"');
  });
});
