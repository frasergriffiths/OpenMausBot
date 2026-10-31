import { FolderOpen, Puzzle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { useCloudFilesReady } from "@/lib/cloud-files";
import { t } from "@/lib/i18n";
import { useSidebarToolsLayout, type SidebarDensity } from "@/lib/sidebar-preferences";
import { useStore } from "@/state/store";

import { SidebarSectionHeader } from "./SidebarSectionHeader";
import { UpdateIndicator } from "./UpdateIndicator";


function NavRow({
  id,
  label,
  icon,
  active = false,
  attention = false,
  iconsOnly,
  rail = false,
  tourId,
  onClick,
}: {
  id: string;
  label: string;
  icon: (active: boolean) => ReactNode;
  active?: boolean;
  attention?: boolean;
  iconsOnly: boolean;
  rail?: boolean;
  tourId?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-tour={tourId}
      data-sidebar-nav={id}
      onClick={onClick}
      aria-label={iconsOnly ? label : undefined}
      title={iconsOnly ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center rounded-xl transition-colors",
        rail ? "size-9 shrink-0 justify-center" : iconsOnly ? "mx-auto size-[46px] shrink-0 justify-center" : "w-full min-h-9 gap-3 px-3 py-1.5 text-left",
        active ? "bg-raised text-ink" : "text-ink hover:bg-raised/50",
      )}
    >
      {icon(active)}
      {!iconsOnly && <span className="flex-1 truncate text-[14px] font-medium leading-5">{label}</span>}
      {attention && (
        <span
          data-testid="routines-attention"
          className={cn("size-2 shrink-0 rounded-full bg-danger", iconsOnly && (rail ? "absolute right-1 top-1" : "absolute right-2 top-2"))}
        />
      )}
    </button>
  );
}

/** A footer place's one geometry: 36px square, 12px radius, the ink hover, and the same open fill for all three. */
function FooterIconButton({ nav, tour, label, active = false, haspopup = false, current = false, onOpen, children }: {
  nav: string;
  tour?: string;
  label: string;
  active?: boolean;
  haspopup?: boolean;
  current?: boolean;
  onOpen?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-tour={tour}
      data-sidebar-nav={nav}
      onClick={onOpen}
      aria-label={label}
      title={label}
      aria-current={current ? "page" : undefined}
      aria-haspopup={haspopup ? "dialog" : undefined}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        active ? "bg-raised text-ink hover:bg-raised" : "text-ink-secondary hover:bg-raised/60 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function SidebarAppsButton() {
  const { state, dispatch } = useStore();
  return (
    <FooterIconButton
      nav="apps"
      tour="nav-apps"
      label={t("sidebar.nav.apps")}
      active={state.pluginsOpen}
      haspopup
      onOpen={() => dispatch({ type: "togglePlugins", open: true })}
    >
      <Puzzle size={18} strokeWidth={1.5} />
    </FooterIconButton>
  );
}

/** Team map is a place, so it sits beside Apps rather than inside a menu. */
export function SidebarBottomButtons() {
  return (
    <div data-sidebar-bottom-buttons="" className="flex shrink-0 items-center gap-2">
      <SidebarAppsButton />
      <UpdateIndicator />
    </div>
  );
}

export function SidebarFooterNav({
  density,
  rail = false,
  collapsed = false,
  onToggleCollapsed,
}: {
  density: SidebarDensity;
  rail?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const { state, dispatch } = useStore();
  const iconsOnly = density === "icons";
  const toolsLayout = useSidebarToolsLayout();
  const toolbar = !iconsOnly && toolsLayout === "toolbar";
  const iconSize = iconsOnly && !rail ? 20 : 18;
  const tone = (active: boolean) => (active ? "text-accent" : "text-ink-secondary");
  const filesRow = useCloudFilesReady() && <NavRow
    id="files"
    label={t("sidebar.nav.files")}
    iconsOnly={iconsOnly}
    rail={rail}
    active={state.activeView === "files"}
    icon={(active) => <FolderOpen size={iconSize} className={tone(active)} />}
    onClick={() => dispatch({ type: "showFiles" })}
  />;
  if (!iconsOnly) return null;
  const appsRow = iconsOnly && <NavRow
    id="apps"
    label={t("sidebar.nav.apps")}
    tourId="nav-apps"
    iconsOnly={iconsOnly}
    rail={rail}
    active={state.pluginsOpen}
    icon={(active) => <Puzzle size={iconSize} className={tone(active)} />}
    onClick={() => dispatch({ type: "togglePlugins", open: true })}
  />;
  if (rail) return <nav data-tour="tools" aria-label={t("sidebar.tools")} className="flex flex-col items-center gap-0.5">{appsRow}</nav>;

  const rows = (
    <>
      {appsRow}
      {filesRow}
    </>
  );

  if (iconsOnly) {
    return <nav data-tour="tools" aria-label={t("sidebar.tools")} className="flex flex-col items-center gap-1">{rows}</nav>;
  }
  return (
    <div data-tour="tools">
      <SidebarSectionHeader
        name={t("sidebar.tools")}
        collapsed={collapsed}
        onToggle={onToggleCollapsed}
        reorderable={false}
        dragging={false}
      />
      {!collapsed && <nav aria-label={t("sidebar.tools")} className={toolbar ? "flex flex-row gap-1" : "flex flex-col gap-0.5"}>{rows}</nav>}
    </div>
  );
}
