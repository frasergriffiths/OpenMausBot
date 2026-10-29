import { memo, useEffect, useLayoutEffect, useRef, useState, type Dispatch } from "react";
import { createPortal } from "react-dom";
import { Archive, ArchiveRestore, BellOff, Check, ChevronRight, Clock, Clock3, FolderInput, Link2, Link2Off, Loader2, MoreHorizontal, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import type { Action, AppState, BotProject, Task } from "@/state/store";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { opensRowMenuFromKey } from "@/lib/bulk-select";
import { threadRefUrl } from "@/lib/thread-refs";
import { copyText } from "@/lib/copy-text";
import { ConfirmDialog } from "./ConfirmDialog";
import { threadLinkLabel } from "../../shared/thread-link";
import { isSnoozed, orderedThreadList } from "../../shared/wire";
import { SIMPLE_MENU, SIMPLE_MENU_ITEM, SIMPLE_MENU_SEPARATOR, SIMPLE_ROW_FOCUS } from "./SidebarSimpleTop";
import { navigateThreadMenu } from "./BotProjects";
import { submenuPosition } from "./SidebarPopoverMenu";
import { WorkingTimer } from "./WorkingIndicator";
import { localizedTaskTitle } from "@/lib/task-title";

export { isSnoozed, orderedThreadList };

type ThreadRowTask = Pick<Task, "threadId" | "title" | "projectId" | "busy" | "activity" | "unread" | "closedBy" | "archivedAt" | "snoozedUntil" | "waitingForTeammates" | "link" | "turnStartedAt"> & {
  queued?: boolean;
  createdAt?: number;
  updatedAt?: number;
  lastThreadOrderAt?: number;
};

export function formatUpdatedAt(at: number): string {
  if (!Number.isFinite(at) || at <= 0) return "";
  return new Date(at).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

export function threadUpdatedLabel(at: number, now: number): string {
  if (stampClock(at, now) === undefined) return formatUpdatedAt(at);
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 45) return t("task.updated.justNow");
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t("task.updated.minutes", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (seconds < 86_400) return t("task.updated.hours", { count: hours });
  const days = Math.round(hours / 24);
  if (days === 1) return t("task.updated.yesterday");
  return t("task.updated.days", { count: days });
}

export function stampClock(at: number, now: number): number | undefined {
  if (!Number.isFinite(at) || at <= 0 || !Number.isFinite(now)) return undefined;
  return Math.max(0, Math.round((now - at) / 1000)) < 7 * 86_400 ? now : undefined;
}

export function threadRecency(task: { updatedAt?: number; createdAt?: number }): number {
  if (typeof task.updatedAt === "number" && Number.isFinite(task.updatedAt)) return task.updatedAt;
  if (typeof task.createdAt === "number" && Number.isFinite(task.createdAt)) return task.createdAt;
  return 0;
}

export function threadByline(task: Pick<Task, "closedBy" | "archivedAt" | "snoozedUntil">): string | null {
  const closer = task.closedBy?.name.trim();
  if (closer) return t("task.closedBy", { name: closer });
  if (isArchived(task)) return t("task.archived");
  return isSnoozed(task) ? t("task.snoozed") : null;
}

/** Present, not truthy: a thread stored with archivedAt: 0 is archived. */
export const isArchived = (task: Pick<Task, "archivedAt">): boolean => task.archivedAt !== undefined;

/** Archived threads are drawn as their own group, never mixed into the open ones. */
export function splitArchivedThreads<T extends Pick<Task, "archivedAt">>(tasks: readonly T[]): { open: T[]; archived: T[] } {
  return { open: tasks.filter((task) => !isArchived(task)), archived: tasks.filter((task) => isArchived(task)) };
}

export const nextSixPm = () => {
  const when = new Date();
  when.setHours(18, 0, 0, 0);
  if (when.getTime() <= Date.now()) when.setDate(when.getDate() + 1);
  return when.getTime();
};

export const tomorrowNineAm = () => {
  const when = new Date();
  when.setDate(when.getDate() + 1);
  when.setHours(9, 0, 0, 0);
  return when.getTime();
};

export const isWorking = (task: Pick<Task, "activity" | "busy">): boolean => task.activity === "working" || Boolean(task.busy);

const isWaitingOnTeammate = (task: Pick<Task, "waitingForTeammates">): boolean =>
  task.waitingForTeammates === true;

const demandsAttention = (task: ThreadRowTask, activeId: string) =>
  task.threadId === activeId || task.activity === "waiting-on-you" || isWorking(task) || isWaitingOnTeammate(task) || Boolean(task.queued) || Boolean(task.unread);

export function visibleSidebarThreads<T extends ThreadRowTask>(tasks: T[], activeId: string, query = "", folders: BotProject[] = []): T[] {
  const needle = query.trim().toLowerCase();
  if (needle) {
    return tasks.filter((task) => task.title.toLowerCase().includes(needle) || folders.some((folder) => folder.id === task.projectId && folder.name.toLowerCase().includes(needle)));
  }
  let open = 0;
  return orderedThreadList(tasks).filter((task) => {
    if (isArchived(task)) return task.threadId === activeId;
    return task.closedBy || isSnoozed(task)
      ? demandsAttention(task, activeId)
      : open++ < 6 || demandsAttention(task, activeId);
  });
}

export const nextSnoozeExpiry = (tasks: readonly Pick<Task, "snoozedUntil">[], now = Date.now()): number | undefined =>
  tasks.reduce<number | undefined>((soonest, task) => {
    const until = task.snoozedUntil;
    return until !== undefined && until > 0 && until > now ? Math.min(soonest ?? Number.POSITIVE_INFINITY, until) : soonest;
  }, undefined);

export function useSnoozeExpiry(tasks: readonly Pick<Task, "snoozedUntil">[]): void {
  const [tick, rerender] = useState(0);
  const next = nextSnoozeExpiry(tasks);
  useEffect(() => {
    if (next === undefined) return;
    // setTimeout treats delays above 2^31-1 ms as ~0, so distant deadlines are rechecked in bounded chunks.
    const id = window.setTimeout(() => rerender((count) => count + 1), Math.max(1, Math.min(2_147_483_647, next - Date.now() + 1)));
    return () => window.clearTimeout(id);
  }, [next, tick]);
}

export function useRevealedThreadRow(reveal: AppState["revealThread"], currentThreadId: string | null) {
  useEffect(() => {
    if (!reveal || reveal.threadId !== currentThreadId) return;
    const row = document.querySelector<HTMLElement>(`[data-sidebar-thread-row="${CSS.escape(reveal.threadId)}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [reveal, currentThreadId]);
}

export function useRelativeNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const sync = () => { if (document.visibilityState === "visible") setNow(Date.now()); };
    const timer = window.setInterval(sync, 30_000);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return now;
}
const attentionRank = (task: ThreadRowTask, activeId: string): number => {
  if (task.activity === "waiting-on-you") return 0;
  if (isWaitingOnTeammate(task)) return 2;
  if (task.busy || task.activity === "working") return 1;
  if (task.queued) return 3;
  if (task.unread) return 4;
  if (task.threadId === activeId) return 5;
  return 6;
};

export function orderedSidebarThreads<T extends ThreadRowTask>(tasks: T[], activeId: string): T[] {
  return tasks
    .map((task, index) => ({ task, index, rank: attentionRank(task, activeId) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.task);
}

/** The store actions behind a bot's thread-row menu, for every list that draws that bot's threads. */
export function threadRowActions(botId: string, dispatch: Dispatch<Action>, generatedTitles: boolean) {
  return {
    onRegenerateTitle: generatedTitles ? (task: { threadId: string }, onSettled: (ok: boolean) => void) => dispatch({ type: "regenerateTaskTitle", botId, threadId: task.threadId, onSettled }) : undefined,
    onDelete: (task: { threadId: string }) => dispatch({ type: "deleteTask", botId, threadId: task.threadId }),
    onMove: (task: { threadId: string }, projectId: string | null) => dispatch({ type: "updateTask", botId, threadId: task.threadId, patch: { projectId } }),
    onArchive: (task: { threadId: string }, archivedAt: number | null) => dispatch({ type: "updateTask", botId, threadId: task.threadId, patch: { archivedAt } }),
    onSnooze: (task: { threadId: string }, snoozedUntil: number | null) => dispatch({ type: "updateTask", botId, threadId: task.threadId, patch: { snoozedUntil } }),
    onLink: (task: { threadId: string }, link: string | null) => dispatch({ type: "updateTask", botId, threadId: task.threadId, patch: { link } }),
  };
}

type ThreadRowProps = {
  task: ThreadRowTask;
  ownerId: string;
  current: boolean;
  compact?: boolean;
  folders?: BotProject[];
  activityLabel?: string;
  now?: number;
  locale: string;
  onSelect: (task: ThreadRowTask) => void;
  onRegenerateTitle?: (task: ThreadRowTask, onSettled: (ok: boolean) => void) => void;
  onDelete: (task: ThreadRowTask) => void;
  onMove?: (task: ThreadRowTask, folderId: string | null) => void;
  onArchive?: (task: ThreadRowTask, archivedAt: number | null) => void;
  onSnooze?: (task: ThreadRowTask, snoozedUntil: number | null) => void;
  onLink?: (task: ThreadRowTask, link: string | null) => void;
  onRefreshPermissions?: (task: ThreadRowTask) => void;
  /** The bot panel's taller row: `preview` (the conversation's last line) under the title, and how long a running turn
   * has worked. */
  panel?: boolean;
  preview?: string;
  /** The bot's mascot colour, used by every working indicator on its rows. */
  color?: string;
};

const sameFields = <T extends object>(a: T, b: T): boolean => {
  const keys = Object.keys(a) as (keyof T)[];
  return keys.length === Object.keys(b).length && keys.every((key) => Object.is(a[key], b[key]));
};

const sameThreadRow = ({ task: previousTask, ...previous }: ThreadRowProps, { task, ...next }: ThreadRowProps): boolean =>
  sameFields(previousTask, task) && sameFields(previous, next);

type Submenu = "move" | "snooze";

const DANGER_ROW = cn(SIMPLE_MENU_ITEM, "text-danger");

export const SidebarThreadRow = memo(function SidebarThreadRow({ task, ownerId, current, compact, folders, onSelect, onRegenerateTitle, onDelete, onMove, onArchive, onSnooze, onLink, onRefreshPermissions, activityLabel, now, panel = false, preview, color }: ThreadRowProps) {
  const workingColor = color ?? "var(--color-success)";
  const rowFocus = SIMPLE_ROW_FOCUS;
  const [menu, setMenu] = useState<{ left: number; top: number } | null>(null);
  const [submenu, setSubmenu] = useState<Submenu | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const displayTitle = localizedTaskTitle(task.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const moveRef = useRef<HTMLButtonElement>(null);
  const snoozeRef = useRef<HTMLButtonElement>(null);
  const status = task.activity === "waiting-on-you" ? t("task.waiting") : isWaitingOnTeammate(task) ? t("task.waitingOnTeammate") : isWorking(task) ? activityLabel ?? t("chat.activity.working") : task.queued ? t("task.queued") : null;
  const byline = threadByline(task);
  const updatedAt = threadRecency(task);
  const updatedStamp = formatUpdatedAt(updatedAt);
  const updatedLabel = now === undefined ? updatedStamp : threadUpdatedLabel(updatedAt, now);
  const closed = Boolean(task.closedBy) && !status;
  const archived = isArchived(task);
  const snoozed = isSnoozed(task);
  const choose = () => onSelect(task);
  const contextMenu = (event: React.MouseEvent) => { event.preventDefault(); openMenu(event.clientX, event.clientY); };
  const openMenu = (x: number, y: number) => {
    setSubmenu(null);
    setMenu({ left: Math.max(8, Math.min(x, window.innerWidth - 228)), top: Math.max(8, Math.min(y, window.innerHeight - 230)) });
  };
  const closeMenu = (focusTrigger = false) => {
    setMenu(null);
    setSubmenu(null);
    if (focusTrigger) actionRef.current?.focus();
  };
  const openSubmenu = (which: Submenu, focus: boolean) => {
    setSubmenu(which);
    if (focus) requestAnimationFrame(() => flyoutRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus());
  };
  const closeSubmenu = () => {
    const parent = submenu === "move" ? moveRef.current : submenu === "snooze" ? snoozeRef.current : null;
    setSubmenu(null);
    if (parent) requestAnimationFrame(() => parent.focus());
  };
  const copyLink = () => {
    closeMenu();
    void copyText(threadRefUrl({ botId: ownerId, threadId: task.threadId }));
  };
  const regenerateTitle = () => {
    if (!onRegenerateTitle || regenerating) return;
    setRegenerating(true);
    onRegenerateTitle(task, (ok) => { setRegenerating(false); if (ok) closeMenu(); });
  };
  const pick = (action: () => void) => () => { closeMenu(); action(); };
  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const outside = (event: MouseEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target) && !flyoutRef.current?.contains(event.target) && !actionRef.current?.contains(event.target)) closeMenu();
    };
    window.addEventListener("mousedown", outside);
    return () => window.removeEventListener("mousedown", outside);
  }, [menu]);
  // Measured every render: the panel's height depends on which rows the thread offers.
  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!element || !menu) return;
    const place = () => {
      element.style.left = `${Math.max(8, Math.min(menu.left, window.innerWidth - element.offsetWidth - 8))}px`;
      element.style.top = `${Math.max(8, Math.min(menu.top, window.innerHeight - element.offsetHeight - 8))}px`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  });
  useLayoutEffect(() => {
    const flyout = flyoutRef.current;
    const row = submenu === "move" ? moveRef.current : submenu === "snooze" ? snoozeRef.current : null;
    const sheet = menuRef.current;
    if (!submenu || !flyout || !row || !sheet) return;
    const at = submenuPosition(sheet.getBoundingClientRect(), row.getBoundingClientRect(), { width: flyout.offsetWidth, height: flyout.offsetHeight }, { width: window.innerWidth, height: window.innerHeight });
    flyout.style.left = `${at.left}px`;
    flyout.style.top = `${at.top}px`;
  });
  const heading = <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
    <span dir="auto" className={cn("min-w-0 flex-1 max-w-max truncate", task.unread && "font-semibold text-ink", (closed || archived || snoozed) && !current && "text-ink-tertiary")}>{displayTitle}</span>
    {byline && (
      <span className="min-w-0 max-w-[45%] shrink truncate font-normal text-ink-tertiary">{byline}</span>
    )}
  </span>;
  const submenuParent = (which: Submenu, ref: React.RefObject<HTMLButtonElement | null>, icon: React.ReactNode, label: string) => (
    <button ref={ref} type="button" role="menuitem" aria-haspopup="menu" aria-expanded={submenu === which}
      onClick={() => (submenu === which ? setSubmenu(null) : openSubmenu(which, false))}
      onKeyDown={(event) => {
        if (event.key !== "ArrowRight") return;
        event.preventDefault();
        event.stopPropagation();
        openSubmenu(which, true);
      }}
      className={cn(SIMPLE_MENU_ITEM, submenu === which && "bg-menu-active")}>
      {icon}
      <span className="flex-1">{label}</span>
      <ChevronRight size={16} aria-hidden="true" className="ms-auto text-ink-secondary" />
    </button>
  );
  return <>
    <div className={cn("group/thread relative flex min-w-0 items-center rounded-md", current ? "bg-raised" : "hover:bg-raised/50", panel && cn("items-start rounded-[10px]", current ? "bg-ink/[0.07]" : "hover:bg-ink/[0.04]"))}>
      <button
        type="button" data-sidebar-thread-row={task.threadId} aria-current={current ? "page" : undefined}
        title={[displayTitle, updatedStamp, status, closed ? t("task.closed") : null, archived ? t("task.archived") : null, snoozed ? t("task.snoozed") : null, task.unread ? t("task.unread") : null].filter(Boolean).join(" · ")}
        onClick={choose} onContextMenu={contextMenu}
        onKeyDown={(event) => { if (opensRowMenuFromKey(event.key, event.shiftKey)) { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); openMenu(rect.left, rect.bottom); } }}
        className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-md pl-6 pr-1 text-left text-[13px] font-medium", rowFocus, compact ? "min-h-7 py-1" : "min-h-8 py-1.5", current ? "font-semibold text-ink" : "text-ink-secondary hover:text-ink", panel && "rounded-[10px] py-2 pl-3 text-[14px]")}>
        {panel ? <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {heading}
          {preview && <span dir="auto" className="truncate text-[13px] font-normal text-ink-secondary">{preview}</span>}
          {isWorking(task) && <span data-thread-working="" className="flex items-center gap-1 text-[12px] font-normal" style={{ color: workingColor }}>
            {t("chat.activity.working")}{task.turnStartedAt ? <><span aria-hidden="true">·</span><WorkingTimer since={task.turnStartedAt} /></> : null}
          </span>}
        </span> : heading}
      </button>
      {task.link && <a href={task.link} target="_blank" rel="noreferrer" dir="ltr" title={task.link} aria-label={t("task.openLink", { link: threadLinkLabel(task.link) ?? task.link })}
        className={cn("shrink-0 rounded px-1 font-mono text-[11px] text-ink-secondary hover:bg-raised hover:text-ink [unicode-bidi:isolate]", rowFocus)}>{threadLinkLabel(task.link) ?? t("task.link")}</a>}
      <span className={cn("flex shrink-0 items-center gap-2 px-1", panel && "pt-2.5")} onClick={choose} onContextMenu={contextMenu}>
        {updatedLabel && <time dateTime={new Date(updatedAt).toISOString()} className="shrink-0 tabular-nums text-[11px] text-ink-secondary">{updatedLabel}</time>}
        {task.activity === "waiting-on-you" ? <span className="shrink-0 text-[11px] font-medium text-warning">{t("task.waiting")}</span> : isWaitingOnTeammate(task) ? <Clock3 size={11} className="shrink-0 text-ink-secondary" aria-label={t("task.waitingOnTeammate")} /> : isWorking(task) && !panel ? <Loader2 size={11} className="shrink-0 animate-spin" style={{ color: workingColor }} aria-label={activityLabel ?? t("chat.activity.working")} /> : task.queued ? <span className="shrink-0 text-[11px] text-ink-secondary">{t("task.queued")}</span> : null}
        {task.unread && <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-label={t("task.unread")} />}
      </span>
      <button ref={actionRef} type="button" aria-label={t("task.actions", { title: displayTitle })} aria-expanded={Boolean(menu)}
        onClick={(event) => { if (menu) { closeMenu(); return; } const rect = event.currentTarget.getBoundingClientRect(); openMenu(rect.left, rect.bottom); }}
        className={cn("mr-0.5 flex size-6 shrink-0 items-center justify-center rounded text-ink-secondary opacity-0 hover:bg-raised hover:text-ink focus-visible:opacity-100 aria-expanded:opacity-100 group-hover/thread:opacity-100 max-md:opacity-70 touch:opacity-70", panel && "mt-1.5")}>
        <MoreHorizontal size={13} />
      </button>
    </div>
    {menu && createPortal(<div ref={menuRef} data-thread-overlay role="menu" aria-label={t("task.actions", { title: displayTitle })} style={{ left: menu.left, top: menu.top }}
      className={cn("fixed z-50 w-[220px] max-h-[calc(100dvh-16px)] overflow-y-auto overscroll-contain", SIMPLE_MENU)}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeMenu(true); return; }
        if (event.key === "Tab") { closeMenu(); return; }
        navigateThreadMenu(event);
      }}>
      <button type="button" role="menuitem" onClick={copyLink} className={SIMPLE_MENU_ITEM}><Link2 size={16} className="text-ink-secondary" />{t("task.copyLink")}</button>
      {onLink && task.link && <button type="button" role="menuitem" onClick={pick(() => onLink(task, null))} className={SIMPLE_MENU_ITEM}><Link2Off size={16} className="text-ink-secondary" />{t("task.removeLink")}</button>}
      {onRegenerateTitle && <button type="button" role="menuitem" disabled={regenerating} aria-busy={regenerating} onClick={regenerateTitle} className={SIMPLE_MENU_ITEM}>{regenerating ? <Loader2 size={16} className="animate-spin text-ink-secondary" /> : <RefreshCw size={16} className="text-ink-secondary" />}{regenerating ? t("task.regeneratingTitle") : t("task.regenerateTitle")}</button>}
      <div role="separator" className={SIMPLE_MENU_SEPARATOR} />
      {onMove && Boolean(folders?.length) && submenuParent("move", moveRef, <FolderInput size={16} className="text-ink-secondary" />, t("folder.move"))}
      {onArchive && <button type="button" role="menuitem" disabled={isWorking(task)} onClick={pick(() => onArchive(task, isArchived(task) ? null : Date.now()))} className={SIMPLE_MENU_ITEM}>{archived ? <ArchiveRestore size={16} className="text-ink-secondary" /> : <Archive size={16} className="text-ink-secondary" />}{archived ? t("task.unarchive") : t("task.archive")}</button>}
      {onSnooze && <>
        <div role="separator" className={SIMPLE_MENU_SEPARATOR} />
        {submenuParent("snooze", snoozeRef, <Clock size={16} className="text-ink-secondary" />, t("task.snooze"))}
      </>}
      {onRefreshPermissions && <>
        <div role="separator" className={SIMPLE_MENU_SEPARATOR} />
        <button type="button" role="menuitem" disabled={isWorking(task)} title={t("task.refreshPermissionsHint")} onClick={pick(() => onRefreshPermissions(task))} className={SIMPLE_MENU_ITEM}><ShieldCheck size={16} className="text-ink-secondary" />{t("task.refreshPermissions")}</button>
      </>}
      <div role="separator" className={SIMPLE_MENU_SEPARATOR} />
      <button type="button" role="menuitem" disabled={isWorking(task)} onClick={() => { closeMenu(); setDeleting(true); }} className={DANGER_ROW}><Trash2 size={16} />{t("thread.menu.delete")}</button>
    </div>, document.body)}
    {menu && submenu === "move" && createPortal(<div ref={flyoutRef} data-thread-overlay role="menu" aria-label={t("folder.move")}
      className={cn("fixed z-50 w-max min-w-[180px] max-w-[240px] overflow-y-auto overscroll-contain", SIMPLE_MENU)}
      onKeyDown={(event) => {
        if (event.key === "Escape" || event.key === "ArrowLeft" || event.key === "Tab") {
          event.preventDefault();
          event.stopPropagation();
          if (event.key === "Tab") closeMenu(true); else closeSubmenu();
          return;
        }
        navigateThreadMenu(event);
      }}>
      <button type="button" role="menuitem" onClick={pick(() => onMove?.(task, null))} className={SIMPLE_MENU_ITEM}>
        <span className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{t("folder.none")}</span>
        {!folders?.some((folder) => folder.id === task.projectId) && <Check size={16} className="ms-auto text-accent" />}
      </button>
      <div role="separator" className={SIMPLE_MENU_SEPARATOR} />
      {folders?.map((folder) => <button key={folder.id} type="button" role="menuitem" onClick={pick(() => onMove?.(task, folder.id))} className={SIMPLE_MENU_ITEM}>
        {folder.emoji ? <span aria-hidden="true" className="shrink-0">{folder.emoji}</span> : <span aria-hidden="true" className="size-4 shrink-0" />}
        <span className="min-w-0 flex-1 truncate max-w-[200px]">{folder.name}</span>
        {folder.id === task.projectId && <Check size={16} className="ms-auto text-accent" />}
      </button>)}
    </div>, document.body)}
    {menu && submenu === "snooze" && createPortal(<div ref={flyoutRef} data-thread-overlay role="menu" aria-label={t("task.snooze")}
      className={cn("fixed z-50 w-max min-w-[180px] max-w-[240px] overflow-y-auto overscroll-contain", SIMPLE_MENU)}
      onKeyDown={(event) => {
        if (event.key === "Escape" || event.key === "ArrowLeft" || event.key === "Tab") {
          event.preventDefault();
          event.stopPropagation();
          if (event.key === "Tab") closeMenu(true); else closeSubmenu();
          return;
        }
        navigateThreadMenu(event);
      }}>
      {snoozed && <>
        <button type="button" role="menuitem" onClick={pick(() => onSnooze?.(task, null))} className={SIMPLE_MENU_ITEM}><BellOff size={16} className="text-ink-secondary" />{t("task.stopSnoozing")}</button>
        <div role="separator" className={SIMPLE_MENU_SEPARATOR} />
      </>}
      {[{ label: t("task.snoozeUntilActivity"), at: 0 }, { label: t("task.snoozeTonight"), at: nextSixPm() }, { label: t("task.snoozeTomorrow"), at: tomorrowNineAm() }].map((preset) => (
        <button key={preset.label} type="button" role="menuitem" disabled={isWorking(task)} onClick={pick(() => onSnooze?.(task, preset.at))} className={SIMPLE_MENU_ITEM}>{preset.label}</button>
      ))}
    </div>, document.body)}
    <ConfirmDialog open={deleting} title={t("task.deleteConfirm")} body={t("task.deleteBody", { title: task.title })} confirmLabel={t("task.deleteAria")}
      onCancel={() => setDeleting(false)} onConfirm={() => { if (!isWorking(task)) onDelete(task); setDeleting(false); }} returnFocusRef={actionRef} />
  </>;
}, sameThreadRow);
