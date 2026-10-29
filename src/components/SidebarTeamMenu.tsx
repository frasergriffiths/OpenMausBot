import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Network, Pencil, Share2, SlidersHorizontal, Trash2, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { useHeldMenuMotion } from "./MenuMotion";
import { navigateThreadMenu } from "./BotProjects";
import { SIMPLE_MENU, SIMPLE_MENU_ITEM, SIMPLE_MENU_SEPARATOR } from "./SidebarSimpleTop";

export { showWhoReportsToWhom } from "./TeamOrgChart";

const EDGE_MARGIN = 8;
const ANCHOR_GAP = 6;

const ITEM = cn(SIMPLE_MENU_ITEM, "text-ink hover:bg-menu-hover");

export interface TeamMenuAnchor { left: number; right: number; top: number; bottom: number }
export interface TeamMenuState { name: string; anchor: TeamMenuAnchor; trigger: HTMLElement | null }

/** Below the trigger, flipped above when the panel would leave the window, then kept 8px inside every edge. */
export function teamMenuPosition(anchor: TeamMenuAnchor, menu: { width: number; height: number }, viewport: { width: number; height: number }) {
  const maxLeft = Math.max(EDGE_MARGIN, viewport.width - menu.width - EDGE_MARGIN);
  const left = Math.min(Math.max(anchor.right - menu.width, EDGE_MARGIN), maxLeft);
  const below = anchor.bottom + ANCHOR_GAP;
  const above = anchor.top - ANCHOR_GAP - menu.height;
  const fitsBelow = below + menu.height <= viewport.height - EDGE_MARGIN;
  const top = fitsBelow || above < EDGE_MARGIN ? below : above;
  const maxTop = Math.max(EDGE_MARGIN, viewport.height - menu.height - EDGE_MARGIN);
  return { left, top: Math.min(Math.max(top, EDGE_MARGIN), maxTop) };
}

/** A department's menu, from its line's ⋯ or a right-click on its name. */
export function TeamMenuItems({ onAddBots, onRename, onShare, onDelete, onSetForAll, onSetOwner, onSeeReports }: {
  onAddBots: () => void;
  onRename: () => void;
  onShare: () => void;
  onDelete: () => void;
  onSetForAll?: () => void;
  onSetOwner?: () => void;
  onSeeReports?: () => void;
}) {
  return (
    <>
      <button type="button" role="menuitem" className={ITEM} onClick={onAddBots}><Users size={16} className="text-ink-secondary" />{t("team.addBots")}</button>
      {(onSetForAll || onSeeReports || onSetOwner) && <>
        <div role="separator" className={SIMPLE_MENU_SEPARATOR} />
        {onSetForAll && <button type="button" role="menuitem" className={ITEM} onClick={onSetForAll}><SlidersHorizontal size={16} className="text-ink-secondary" />{t("teamSettings.menu")}</button>}
        {onSeeReports && <button type="button" role="menuitem" className={ITEM} onClick={onSeeReports}><Network size={16} className="text-ink-secondary" />{t("orgChart.seeWho")}</button>}
        {onSetOwner && <button type="button" role="menuitem" className={ITEM} onClick={onSetOwner}><UserRound size={16} className="text-ink-secondary" />{t("owner.setForAll")}</button>}
        <div role="separator" className={SIMPLE_MENU_SEPARATOR} />
      </>}
      <button type="button" role="menuitem" className={ITEM} onClick={onRename}><Pencil size={16} className="text-ink-secondary" />{t("team.rename")}</button>
      <button type="button" role="menuitem" className={ITEM} onClick={onShare}><Share2 size={16} className="text-ink-secondary" />{t("team.share")}</button>
      <div role="separator" className={SIMPLE_MENU_SEPARATOR} />
      <button type="button" role="menuitem" className={cn(SIMPLE_MENU_ITEM, "text-danger hover:bg-menu-hover")} onClick={onDelete}><Trash2 size={16} />{t("team.deleteMenu")}</button>
    </>
  );
}

/** The department menu's panel: the same surface, rows and pop motion as the bot menu. */
export function TeamContextMenu({ menu, onClose, onAddBots, onRename, onShare, onDelete, onSetForAll, onSetOwner, onSeeReports }: {
  menu: TeamMenuState | null;
  onClose: () => void;
  onAddBots: (menu: TeamMenuState) => void;
  onRename: (menu: TeamMenuState) => void;
  onShare: (menu: TeamMenuState) => void;
  onDelete: (menu: TeamMenuState) => void;
  onSetForAll?: (menu: TeamMenuState) => void;
  onSetOwner?: (menu: TeamMenuState) => void;
  onSeeReports?: (menu: TeamMenuState) => void;
}) {
  const motion = useHeldMenuMotion(menu);
  const panelRef = useRef<HTMLDivElement>(null);
  const shown = motion.value;

  useLayoutEffect(() => {
    const element = panelRef.current;
    if (!element || !shown) return;
    const place = () => {
      const { width, height } = element.getBoundingClientRect();
      const at = teamMenuPosition(shown.anchor, { width, height }, { width: window.innerWidth, height: window.innerHeight });
      element.style.left = `${at.left}px`;
      element.style.top = `${at.top}px`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  });

  // Kept apart from the listeners: onClose is fresh every render, and re-running this would pull focus back to the
  // first item.
  useEffect(() => {
    if (!menu) return;
    const opener = menu.trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    panelRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
    return () => { if (opener?.isConnected) opener.focus(); };
  }, [menu]);
  useEffect(() => {
    if (!menu) return;
    const onDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (panelRef.current?.contains(event.target) || menu.trigger?.contains(event.target)) return;
      onClose();
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menu, onClose]);

  if (!motion.shown || !shown) return null;
  const fire = (action: (menu: TeamMenuState) => void) => () => { onClose(); action(shown); };
  const optional = (action?: (menu: TeamMenuState) => void) => action ? fire(action) : undefined;
  return createPortal(
    <div
      ref={panelRef}
      data-team-menu
      role="menu"
      aria-label={shown.name}
      style={{ left: shown.anchor.right, top: shown.anchor.bottom }}
      className={cn("fixed z-40 max-h-[calc(100dvh-16px)] w-max min-w-[198px] max-w-[calc(100vw-16px)] overflow-y-auto overscroll-contain", SIMPLE_MENU, motion.className)}
      {...motion.exitProps}
      onKeyDown={(event) => {
        if (event.key === "Escape" || event.key === "Tab") { event.preventDefault(); event.stopPropagation(); onClose(); return; }
        navigateThreadMenu(event);
      }}
    >
      <TeamMenuItems
        onAddBots={fire(onAddBots)}
        onRename={fire(onRename)}
        onShare={fire(onShare)}
        onDelete={fire(onDelete)}
        onSetForAll={optional(onSetForAll)}
        onSetOwner={optional(onSetOwner)}
        onSeeReports={optional(onSeeReports)}
      />
    </div>,
    document.body,
  );
}
