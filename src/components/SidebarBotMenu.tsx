import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, BellDot, CheckCheck, ChevronRight, ClipboardCopy, Copy, Crown, FolderPlus, Loader2, MoreHorizontal, Pencil, Pin, PinOff, SquarePen, Users } from "lucide-react";
import { api, useStore, openBot, type Bot } from "@/state/store";
import { cn } from "@/lib/cn";
import { useHeldMenuMotion } from "./MenuMotion";
import { t } from "@/lib/i18n";
import { copyText } from "@/lib/copy-text";
import { BotDeleteMenuItem } from "./BotMenuDelete";
import { HideDefaultBotItem } from "./DefaultBotControls";
import { navigateThreadMenu } from "./BotProjects";
import { botUnreadThreadIds, markBotRead } from "@/lib/folder-read";
import { ownerMenuLabel, pickOwnerOf } from "./TeamOwner";
import { mayChangeOwner, useTeamPeople } from "@/state/team-people";
import { SIMPLE_MENU, SIMPLE_MENU_ITEM, SIMPLE_MENU_SEPARATOR } from "./SidebarSimpleTop";
import { useShowThreads } from "@/lib/thread-preferences";
import { submenuPosition } from "./SidebarPopoverMenu";
import { submenuIntent, type SubmenuIntent } from "@/lib/submenu-intent";
import { useMoveToTeam } from "./MoveToTeam";
import type { MenuState } from "./Sidebar";

export function BotContextMenu({
  menu,
  onClose,
  onArchive,
  onDelete,
  onMoveToSection,
  onRename,
}: {
  menu: MenuState | null;
  onClose: () => void;
  onArchive: (bot: Bot) => void;
  onDelete: (bot: Bot) => void;
  onMoveToSection: (botId: string) => void;
  onRename?: (botId: string) => void;
}) {
  const motion = useHeldMenuMotion(menu);
  const moreRef = useRef<HTMLButtonElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const hoveredRow = useRef<Element | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreEngaged, setMoreEngaged] = useState(false);
  const moreIntent = useRef<SubmenuIntent | null>(null);
  moreIntent.current ??= submenuIntent({
    open: () => setMoreOpen(true),
    close: () => { setMoreOpen(false); setMoreEngaged(false); },
    submenuBox: () => flyoutRef.current?.getBoundingClientRect() ?? null,
  });
  const more = moreIntent.current;
  const shown = motion.value;
  const { state, dispatch } = useStore();
  const showThreads = useShowThreads();
  const moveToTeam = useMoveToTeam({ blocked: (bot) => (bot.defaultBot ? t("teamMove.blockedDefault", { name: bot.name }) : bot.chiefOfStaff ? t("teamMove.blockedChief") : state.bots.filter((candidate) => !candidate.hidden).length <= 1 ? t("teamMove.blockedLast") : undefined) });
  const remoteClient = window.ogb?.remoteClient?.active === true;
  const bot = shown ? state.bots.find((b) => b.id === shown.botId) : undefined;
  const team = useTeamPeople();
  const menuRef = useRef<HTMLDivElement>(null);
  const latestMenu = useRef(menu);
  useLayoutEffect(() => { latestMenu.current = menu; }, [menu]);
  const readInFlight = useRef(false);
  const [readingBotId, setReadingBotId] = useState<string | null>(null);
  const [readError, setReadError] = useState<{ botId: string; message: string } | null>(null);
  useEffect(() => { setReadError(null); }, [menu?.botId]);
  const readAll = async (owner: Bot) => {
    if (readInFlight.current) return;
    readInFlight.current = true;
    setReadingBotId(owner.id);
    setReadError(null);
    const openedMenu = menu;
    try {
      await markBotRead(owner, api, (updated) => dispatch({ type: "botPatched", bot: updated }));
      if (latestMenu.current === openedMenu) onClose();
    } catch (error) {
      const guidance = t("sidebar.bot.markAllReadFailed");
      setReadError({ botId: owner.id, message: error instanceof Error ? `${guidance} ${error.message}` : guidance });
    } finally {
      readInFlight.current = false;
      setReadingBotId(null);
    }
  };
  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!element || !shown) return;
    const place = () => {
      const { width, height } = element.getBoundingClientRect();
      element.style.top = `${Math.max(8, Math.min(shown.y, window.innerHeight - height - 8))}px`;
      element.style.left = `${Math.max(8, Math.min(shown.x, window.innerWidth - width - 8))}px`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  });
  // Kept apart from the listeners: onClose is fresh every render, and re-running this would pull focus back to the
  // first item.
  useEffect(() => {
    if (!menu) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    menuRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
    return () => { if (opener?.isConnected) opener.focus(); };
  }, [menu]);
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest("[data-bot-menu]")) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onClose);
    };
  }, [menu, onClose]);
  useEffect(() => {
    moreIntent.current?.reset();
    hoveredRow.current = null;
    setMoreOpen(false);
    setMoreEngaged(false);
  }, [menu]);
  useEffect(() => () => moreIntent.current?.reset(), []);
  useLayoutEffect(() => {
    const flyout = flyoutRef.current, row = moreRef.current, sheet = menuRef.current;
    if (!moreOpen || !flyout || !row || !sheet) return;
    const place = submenuPosition(sheet.getBoundingClientRect(), row.getBoundingClientRect(), { width: flyout.offsetWidth, height: flyout.offsetHeight }, { width: window.innerWidth, height: window.innerHeight });
    flyout.style.left = `${place.left}px`;
    flyout.style.top = `${place.top}px`;
  });

  if (!motion.shown || !bot || !shown) return <>{moveToTeam.dialog}</>;
  const deleting = state.deletingBots[bot.id] === true;
  const engine = state.instances.find((instance) => instance.instanceId === bot.modelSelection.instanceId);
  const canCoordinate = engine?.capabilities?.agentsMcp === true;
  const visibleBotCount = state.bots.filter((candidate) => !candidate.hidden).length;
  const archiveBlocked = Boolean(bot.chiefOfStaff) || visibleBotCount <= 1;
  const archiveHint = bot.chiefOfStaff
    ? t("sidebar.bot.archiveBlockedChief")
    : visibleBotCount <= 1
      ? t("sidebar.bot.archiveBlockedLast")
      : undefined;
  const openForSettings = () => {
    if (state.selectedId === bot.id) dispatch({ type: "select", id: bot.id });
    else openBot(dispatch, bot, showThreads);
  };
  const item = (
    icon: React.ReactNode,
    label: string,
    onClick?: () => void,
    opts?: { danger?: boolean; disabled?: boolean; hint?: string; keepOpen?: boolean },
  ) => (
    <button
      key={label}
      type="button"
      role="menuitem"
      disabled={opts?.disabled}
      onClick={() => {
        onClick?.();
        if (!opts?.keepOpen) onClose();
      }}
      title={opts?.hint}
      className={cn(
        SIMPLE_MENU_ITEM,
        opts?.danger ? "text-danger" : "text-ink",
        opts?.disabled ? "cursor-default opacity-40" : "hover:bg-menu-hover",
      )}
    >
      {icon}
      {label}
    </button>
  );
  const divider = (key: string) =>
    <div key={key} role="separator" className={SIMPLE_MENU_SEPARATOR} />;

    const showMore = (focus: boolean) => {
      more.openNow("more");
      if (focus) requestAnimationFrame(() => flyoutRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus());
    };
    const copyId = item(<ClipboardCopy size={16} className="text-ink-secondary" />, t("sidebar.copyBotId"), () => { void copyText(bot.id); });
    const moveToSection = item(<FolderPlus size={16} className="text-ink-secondary" />, t("sidebar.bot.moveToSection"), () => { onClose(); onMoveToSection(bot.id); });
    const rename = onRename && item(<SquarePen size={16} className="text-ink-secondary" />, t("sidebar.bot.rename"), () => onRename(bot.id));
    const editProfile = item(<Pencil size={16} className="text-ink-secondary" />, t("sidebar.bot.simple.editProfile"), () => {
      openForSettings();
      if (!state.settingsOpen) dispatch({ type: "toggleSettings", open: true });
    });
    const owner = team && mayChangeOwner(bot, team) ? item(<Users size={16} className="text-ink-secondary" />, ownerMenuLabel(bot, team), () => pickOwnerOf([bot], team, shown)) : null;
    const readState = readingBotId === bot.id || botUnreadThreadIds(bot).length > 0
      ? item(
        readingBotId === bot.id ? <Loader2 size={16} className="animate-spin text-ink-secondary" /> : <CheckCheck size={16} className="text-ink-secondary" />,
        readingBotId === bot.id ? t("sidebar.bot.markingAllRead") : t("sidebar.bot.markAllRead"),
        () => { void readAll(bot); },
        { disabled: readingBotId !== null, keepOpen: true },
      )
      : item(<BellDot size={16} className="text-ink-secondary" />, t("sidebar.bot.simple.markUnread"), () => dispatch({ type: "markUnread", botId: bot.id }));
    const moreItems = remoteClient ? [editProfile, owner] : [
      editProfile,
      item(
        <Crown size={16} className={bot.chiefOfStaff ? "text-accent" : "text-ink-secondary"} />,
        bot.chiefOfStaff ? t("sidebar.bot.removeChief") : t("sidebar.bot.makeChief"),
        () => dispatch({ type: "updateBot", botId: bot.id, patch: { chiefOfStaff: !bot.chiefOfStaff } }),
        { disabled: !bot.chiefOfStaff && !canCoordinate, hint: !bot.chiefOfStaff && !canCoordinate ? t("sidebar.bot.chiefNeedsEngine") : undefined },
      ),
      item(<Copy size={16} className="text-ink-secondary" />, t("sidebar.bot.duplicate"), () => dispatch({ type: "duplicateBot", botId: bot.id })),
      owner,
      ...moveToTeam.items(bot, item),
    ];
    const moreRow = (
      <button
        key="more"
        ref={moreRef}
        type="button"
        role="menuitem"
        data-bot-menu-more=""
        aria-haspopup="menu"
        aria-expanded={moreOpen}
        onClick={(event) => (moreOpen ? more.closeNow() : showMore(event.detail === 0))}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight") return;
          event.preventDefault();
          showMore(true);
        }}
        className={cn(SIMPLE_MENU_ITEM, "text-ink hover:bg-menu-hover", moreOpen && moreEngaged && "bg-menu-active")}
      >
        <MoreHorizontal size={16} className="text-ink-secondary" />
        <span className="flex-1">{t("sidebar.bot.more")}</span>
        <ChevronRight size={15} aria-hidden="true" className="text-ink-secondary rtl:-scale-x-100" />
      </button>
    );
    const leave = bot.defaultBot ? [
      <HideDefaultBotItem key="hide" bot={bot} onDone={onClose} className={SIMPLE_MENU_ITEM} />,
      <BotDeleteMenuItem key="delete" deleting={deleting} className={SIMPLE_MENU_ITEM} onClick={() => { onClose(); onDelete(bot); }} />,
    ] : [
      item(<Archive size={16} className="text-ink-secondary" />, t("sidebar.bot.archive"), () => onArchive(bot), { disabled: archiveBlocked, hint: archiveHint }),
      <BotDeleteMenuItem key="delete" deleting={deleting} className={SIMPLE_MENU_ITEM} onClick={() => { onClose(); onDelete(bot); }} />,
    ];
    return <>{moveToTeam.dialog}{createPortal(
      <div
        ref={menuRef}
        data-bot-menu
        data-sidebar
        role="menu"
        aria-label={t("sidebar.bot.actions", { name: bot.name })}
        onKeyDown={navigateThreadMenu}
        onPointerOver={(event) => {
          const row = event.target instanceof Element ? event.target.closest('[role="menuitem"]') : null;
          if (!row || row === hoveredRow.current) return;
          if (hoveredRow.current === moreRef.current) more.leaveRow("more");
          hoveredRow.current = row;
          const onMore = row === moreRef.current;
          more.enterRow(onMore ? "more" : "row", onMore, { x: event.clientX, y: event.clientY });
        }}
        onPointerMove={(event) => more.move({ x: event.clientX, y: event.clientY }, moreOpen && moreRef.current?.contains(event.target as Node) === true)}
        onPointerLeave={() => {
          if (hoveredRow.current === moreRef.current) more.leaveRow("more");
          hoveredRow.current = null;
          more.leaveMenu();
        }}
        style={{ top: shown.y, left: shown.x }}
        className={cn("fixed z-40 max-h-[calc(100dvh-16px)] w-max min-w-[198px] max-w-[calc(100vw-16px)] overflow-y-auto overscroll-contain", SIMPLE_MENU, motion.className)} {...motion.exitProps}
      >
        {remoteClient ? [moveToSection, ...(rename ? [divider("rename"), rename] : []), divider("copy"), copyId, moreRow] : [
          item(
            bot.pinned ? <PinOff size={16} className="text-ink-secondary" /> : <Pin size={16} className="text-ink-secondary" />,
            bot.pinned ? t("sidebar.bot.unpin") : t("sidebar.bot.pin"),
            () => dispatch({ type: "updateBot", botId: bot.id, patch: { pinned: !bot.pinned } }),
          ),
          moveToSection,
          readState,
          ...(rename ? [divider("rename"), rename] : []),
          divider("copy"),
          copyId,
          moreRow,
          divider("leave"),
          ...leave,
        ]}
        {readError?.botId === bot.id && <p role="alert" className="px-2 py-1.5 text-[12px] text-danger">{readError.message}</p>}
      </div>,
      document.body,
    )}{moreOpen && createPortal(
      <div
        ref={flyoutRef}
        data-bot-menu
        data-sidebar
        role="menu"
        aria-label={t("sidebar.bot.more")}
        onPointerEnter={() => { more.enterSubmenu(); setMoreEngaged(true); }}
        onPointerLeave={() => setMoreEngaged(false)}
        onFocus={() => setMoreEngaged(true)}
        onBlur={(event) => { if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) setMoreEngaged(false); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            more.closeNow();
            moreRef.current?.focus();
            return;
          }
          navigateThreadMenu(event);
        }}
        style={{ top: shown.y, left: shown.x }}
        className={cn("fixed z-40 max-h-[calc(100dvh-16px)] w-max min-w-[180px] max-w-[calc(100vw-16px)] overflow-y-auto overscroll-contain", SIMPLE_MENU)}
      >
        {moreItems}
      </div>,
      document.body,
    )}</>;
}
