import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Cloud, Laptop } from "lucide-react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import type { Action } from "@/state/store";
import type { CloudPlanSnapshot } from "../../electron/cloud-account.mjs";
import { cloudColor } from "@/lib/cloud-look";
import { t } from "@/lib/i18n";
import { usePopoverDismiss } from "@/hooks/use-popover-dismiss";
import { CloudTile } from "./cloud-buy/parts";
import { useMenuMotion } from "./MenuMotion";
import { PlaceIcon } from "./PlaceIcon";
import { SIMPLE_RAIL_BUTTON } from "./SidebarSimpleTop";

export function openServerMenu(bridge: { menu: (options?: { from?: "howto" }) => Promise<void> }, { howTo = false, onClosed }: { howTo?: boolean; onClosed?: () => void } = {}): Promise<void> {
  return bridge.menu(howTo ? { from: "howto" } : undefined).finally(() => { if (howTo) onClosed?.(); });
}

export function endCloudHowTo(dispatch: (action: Action) => void): void {
  track("cloud_howto", { result: "closed" });
  dispatch({ type: "cloudHowTo", open: false });
}

function PowerLine({ text }: { text: string }) {
  return <span className="font-normal text-ink-secondary"> · {text}</span>;
}

/** Whether a plan sleeps when idle, from main's verified plan: an active plan whose Cloud the Admin never sleeps does not;
 * null while that isn't known. */
export function planSleeps(plan: CloudPlanSnapshot | null): boolean | null {
  if (plan?.sleeps === true) return true;
  return plan?.status === "paid" ? false : null;
}

/** On My Cloud's page in the app, whether its plan sleeps when idle (planSleeps; null while unknown, and always in a
 * browser); on this computer's page, whether opening My Cloud waits for it to wake. */
export function useCloudPower(cloudHome: boolean): { sleeps: boolean | null; waking: boolean } {
  const plan = cloudHome && !window.ogb?.remoteClient?.active ? window.ogb?.cloudPlan : undefined;
  const account = cloudHome || window.ogb?.remoteClient?.active ? undefined : window.ogb?.cloudAccount;
  const [sleeps, setSleeps] = useState<boolean | null>(null);
  const [waking, setWaking] = useState(false);
  useEffect(() => {
    if (!plan) return;
    let alive = true;
    void plan.state().then((state) => { if (alive) setSleeps(planSleeps(state)); }).catch(() => {});
    return () => { alive = false; };
  }, [plan]);
  useEffect(() => account?.onState((state) => setWaking(state.waking === true)), [account]);
  return { sleeps: plan ? sleeps : null, waking };
}

/** One computer this app can switch to: this computer (id "local"), or a saved environment or server. */
type SavedComputer = { id: string; name: string; kind?: string; origin?: string; color?: string; missing?: boolean };
type SavedComputers = { activeId: string; environments: SavedComputer[] };

export type WorkspacePlace = ReturnType<typeof useWorkspacePlace>;

/**
 * Security: switching is offered as a list the desktop's main process owns; a remote workspace cannot choose a
 * destination or read the other computers saved here. A cloud page keeps the native chooser, which main allows.
 */
export function useWorkspacePlace({ cloudHome = false, howTo = false, onMenuClosed }: { cloudHome?: boolean; howTo?: boolean; onMenuClosed?: () => void }) {
  const bridge = window.ogb?.workspaces;
  const environments = window.ogb?.environments;
  const [current, setCurrent] = useState<{ local: boolean; name: string; origin?: string; color?: string; home?: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  // null until the saved list arrives; a cloud page never gets one and keeps the native menu.
  const [saved, setSaved] = useState<SavedComputers | null>(null);
  const [anchor, setAnchor] = useState<{ left: number; right: number; top: number; bottom: number } | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const howToOpened = useRef(false);
  useEffect(() => {
    let alive = true;
    void bridge?.state().then((state) => { if (alive) setCurrent(state); }).catch(() => {});
    return () => { alive = false; };
  }, [bridge]);
  useEffect(() => {
    if (!environments) return;
    let alive = true;
    void environments.state().then((state) => { if (alive && state.remote !== true) setSaved(state); }).catch(() => {});
    return () => { alive = false; };
  }, [environments]);
  const power = useCloudPower(cloudHome || current?.home === true);
  const onLine = power.sleeps === null ? "" : t(power.sleeps ? "cloudSetup.sleepsWhenIdle" : "cloudSetup.alwaysOn");
  const waking = power.waking ? t("cloudHome.waking") : "";
  const closeMenu = () => {
    setOpen(false);
    if (howToOpened.current) { howToOpened.current = false; onMenuClosed?.(); }
  };
  const openMenu = (rect?: { left: number; right: number; top: number; bottom: number }) => {
    if (!bridge || open) return;
    setError("");
    if (saved) {
      howToOpened.current = howTo;
      setAnchor(rect ?? null);
      setOpen(true);
      return;
    }
    setOpen(true);
    void openServerMenu(bridge, { howTo, onClosed: onMenuClosed }).catch(() => setError(t("sidebar.switchServerError")))
      .finally(() => setOpen(false));
  };
  const pick = (id: string) => {
    if (!environments || !saved) return;
    closeMenu();
    if (id === saved.activeId) return;
    setSwitching(id);
    setError("");
    void environments.switch(id).then((result) => {
      if (result && result.ok === false) throw new Error("switch failed");
    }).catch(() => setError(t("sidebar.switchServerError")))
      .finally(() => setSwitching(null));
  };
  return { bridge, current, cloudHome, open, error, onLine, waking, openMenu, closeMenu, saved, anchor, switching, pick, switchable: Boolean(bridge) && current?.home !== true };
}

/** The switcher's menu: one themed sheet, portaled past the sidebar, clamped to the window and flipping above its
 * trigger when there is no room below. */
function WorkspaceMenu({ open, anchor, saved, switching, onPick, onClose }: {
  open: boolean;
  anchor: { left: number; right: number; top: number; bottom: number } | null;
  saved: SavedComputers | null;
  switching: string | null;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const motion = useMenuMotion(open);
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const inside = useRef({ contains: (target: unknown) => ref.current?.contains(target as Node) === true });
  usePopoverDismiss(open, inside, onClose);
  useLayoutEffect(() => {
    if (!motion.shown) { setPosition(null); return; }
    const place = () => {
      const menu = ref.current;
      if (!menu) return;
      const edge = 8, gap = 6;
      const size = menu.getBoundingClientRect();
      const width = size.width, height = size.height;
      const box = anchor ?? { left: edge, right: edge, top: edge, bottom: edge };
      const below = box.bottom + gap;
      const above = box.top - gap - height;
      const top = below + height > window.innerHeight - edge && above >= edge ? above : below;
      const left = Math.min(Math.max(edge, box.left), Math.max(edge, window.innerWidth - width - edge));
      setPosition({ left, top: Math.min(Math.max(edge, top), Math.max(edge, window.innerHeight - height - edge)) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [motion.shown, anchor]);
  if (!motion.shown || !saved) return null;
  const rows: SavedComputer[] = [{ id: "local", name: t("automations.editor.app.thisComputer") }, ...saved.environments];
  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={t("sidebar.servers")}
      data-workspace-menu
      style={{
        position: "fixed",
        left: position?.left ?? anchor?.left ?? 8,
        top: position?.top ?? (anchor ? anchor.bottom + 6 : 8),
        visibility: position ? undefined : "hidden",
      }}
      className={cn(
        "popover-surface z-[60] flex w-[248px] max-w-[calc(100vw-16px)] flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-[var(--radius-menu)] border border-hairline/50 bg-menu p-2 shadow-2xl shadow-black/50 [&_svg.lucide]:stroke-[1.5]",
        motion.className,
      )}
      {...motion.exitProps}
    >
      {rows.map((entry) => {
        const checked = entry.id === saved.activeId;
        const busy = switching === entry.id;
        return (
          <button
            key={entry.id}
            type="button"
            role="menuitemradio"
            aria-checked={checked}
            disabled={busy}
            title={entry.origin ? `${entry.name} · ${entry.origin}` : entry.name}
            onClick={() => onPick(entry.id)}
            className={cn(
              "flex min-h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] leading-[18px] text-ink",
              "hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
              checked && "bg-raised",
              busy && "opacity-60",
            )}
          >
            {cloudColor(entry.color)
              ? <CloudTile color={entry.color} size={18} />
              : <PlaceIcon place={entry.origin || entry.kind === "remote" ? "cloud" : "local"} size={18} className="shrink-0 text-ink-secondary" aria-hidden="true" />}
            <span className="min-w-0 flex-1 truncate">{entry.name}</span>
            {checked && <Check size={14} className="shrink-0 text-accent" aria-hidden="true" />}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

export function DesktopWorkspaceSwitcher({ compact = false, inline = false, pill = false, rail = false, cloudHome = false, owner = null, howTo = false, onMenuClosed }: {
  compact?: boolean; inline?: boolean; pill?: boolean; rail?: boolean; cloudHome?: boolean; owner?: string | null; howTo?: boolean; onMenuClosed?: () => void;
}) {
  const { bridge, current, open, error, onLine, waking, openMenu, closeMenu, saved, anchor, switching, pick } = useWorkspacePlace({ cloudHome, howTo, onMenuClosed });
  const withPower = (name: string) => (onLine ? `${name} · ${onLine}` : name);
  // This window's home is My Cloud: it opens nothing else, so there is nothing to switch.
  if (!bridge || current?.home === true) {
    if (!cloudHome && !current?.home) return null;
    const whose = owner ? t("sidebar.cloudOwner", { email: owner }) : "";
    const label = `${withPower(t("cloudSetup.myCloud"))}${whose ? ` · ${whose}` : ""}`;
    if (rail) return <div data-cloud-home-indicator data-workspace-switcher="rail" role="img" aria-label={label} title={label} className="flex size-9 items-center justify-center text-ink-secondary">
      <Cloud size={18} aria-hidden="true" />
    </div>;
    if (inline) return <div data-cloud-home-indicator data-workspace-switcher="inline" title={label}
      className={pill ? "flex h-8 min-w-0 items-center gap-1 rounded-full bg-raised/50 px-3 text-[13px] font-medium text-ink" : "flex min-w-0 items-center gap-1.5 px-1.5 text-[13px] font-medium text-ink"}>
      <Cloud size={pill ? 15 : 14} aria-hidden="true" className={pill ? "hidden shrink-0 text-ink-secondary @max-[124px]/sidebar-top:block" : "shrink-0 text-ink-secondary"} />
      <span className={pill ? "min-w-0 truncate @max-[124px]/sidebar-top:hidden" : "min-w-0 truncate"}>{t("cloudSetup.myCloud")}</span>
      {(onLine || whose) && <span className="sr-only">{onLine ? ` · ${onLine}` : ""}{whose ? ` · ${whose}` : ""}</span>}
    </div>;
    return <div data-cloud-home-indicator className={cn("py-1.5", compact ? "px-2" : "px-3")}>
      <div title={label} className={cn("flex items-center gap-2 py-2 text-[13px] font-medium text-ink", compact ? "justify-center px-1" : "px-2")}>
        <Cloud size={16} aria-hidden="true" className="shrink-0 text-ink-secondary" />
        {compact ? <span className="sr-only">{label}</span> : <span className="min-w-0 flex-1 truncate">{t("cloudSetup.myCloud")}{onLine && <PowerLine text={onLine} />}
          {whose && <span className="block truncate text-[12px] font-normal text-ink-secondary">{whose}</span>}</span>}
      </div>
    </div>;
  }
  const name = current?.name ?? (cloudHome ? t("cloudSetup.myCloud") : t("sidebar.servers"));
  const Icon = current?.local === false || (cloudHome && !current) ? Cloud : Laptop;
  const shown = cloudHome ? withPower(name) : name;
  const title = current?.origin ? `${shown} · ${current.origin}` : shown;
  const label = t("sidebar.switchServer", { name: shown });
  const menu = <WorkspaceMenu open={open} anchor={anchor} saved={saved} switching={switching} onPick={pick} onClose={closeMenu} />;
  if (rail) return <div data-workspace-switcher="rail" className="relative">
    <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} data-cloud-home-indicator={cloudHome || undefined}
      data-tour="server-switcher" title={title} onClick={(event) => openMenu(event.currentTarget.getBoundingClientRect())} className={cn(SIMPLE_RAIL_BUTTON, "aria-expanded:bg-raised")}
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
      {cloudColor(current?.color) ? <CloudTile color={current?.color} size={18} /> : <Icon size={18} aria-hidden="true" />}
    </button>
    {menu}
    {error && <p role="alert" className="absolute bottom-0 left-full z-40 ml-2 w-56 rounded-md bg-menu px-2 py-1 text-[11px] text-danger shadow-lg">{error}</p>}
    {waking && !error && <p role="status" data-cloud-waking className="absolute bottom-0 left-full z-40 ml-2 w-56 rounded-md bg-menu px-2 py-1 text-[11px] text-ink-secondary shadow-lg">{waking}</p>}
  </div>;
  if (inline) return <div data-workspace-switcher="inline" className="flex min-w-0">
    <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} data-cloud-home-indicator={cloudHome || undefined}
      data-tour="server-switcher" title={title} onClick={(event) => openMenu(event.currentTarget.getBoundingClientRect())}
      className={pill
        ? "flex h-8 min-w-0 max-w-full items-center gap-1 overflow-hidden rounded-full bg-raised/50 pl-2.5 pr-1.5 text-left text-[13px] font-medium text-ink hover:bg-raised aria-expanded:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        : "flex h-7 min-w-0 max-w-full items-center gap-1.5 overflow-hidden rounded-md px-1.5 text-left text-[13px] font-medium text-ink hover:bg-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"}
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
      {cloudColor(current?.color) ? <CloudTile color={current?.color} size={16} /> : <Icon size={pill ? 15 : 14} aria-hidden="true" data-switcher-icon className={pill ? "hidden shrink-0 text-ink-secondary @max-[124px]/sidebar-top:block" : "shrink-0 text-ink-secondary"} />}
      <span className={pill ? "min-w-0 truncate @max-[124px]/sidebar-top:hidden" : "min-w-0 truncate @max-[96px]/sidebar-top:hidden"}>{name}</span>
      <ChevronDown size={pill ? 12 : 11} aria-hidden="true" className={pill ? "shrink-0 text-ink-tertiary" : "shrink-0 text-ink-secondary"} />
    </button>
    {menu}
    {error && <p role="alert" className="absolute right-2 top-full z-40 mt-1 w-56 max-w-[calc(100%-1rem)] rounded-md bg-menu px-2 py-1 text-[11px] text-danger shadow-lg">{error}</p>}
    {waking && !error && <p role="status" data-cloud-waking className="absolute right-2 top-full z-40 mt-1 w-56 max-w-[calc(100%-1rem)] rounded-md bg-menu px-2 py-1 text-[11px] text-ink-secondary shadow-lg">{waking}</p>}
  </div>;
  return <div className={cn("py-1.5", compact ? "px-2" : "px-3")}>
    <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} data-cloud-home-indicator={cloudHome || undefined}
      data-tour="server-switcher" title={title}
      onClick={(event) => openMenu(event.currentTarget.getBoundingClientRect())}
      className={cn("flex w-full items-center gap-2 rounded-lg py-2 text-left text-[13px] font-medium text-ink hover:bg-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus", compact ? "justify-center px-1" : "px-2")}
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
      {cloudColor(current?.color) ? <CloudTile color={current?.color} size={20} /> : <Icon size={16} className="shrink-0 text-ink-secondary" />}
      {!compact && <><span className="min-w-0 flex-1 truncate">{name}{cloudHome && onLine && <PowerLine text={onLine} />}</span><ChevronDown size={13} className="shrink-0 text-ink-secondary" /></>}
    </button>
    {menu}
    {error && <p role="alert" className="mt-1 text-[11px] text-danger">{error}</p>}
    {waking && !error && <p role="status" data-cloud-waking className="mt-1 text-[11px] text-ink-secondary">{waking}</p>}
  </div>;
}
