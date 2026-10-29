import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Archive, ArchiveRestore, Check, MoreHorizontal, Trash2 } from "lucide-react";

import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { usePopoverDismiss } from "@/hooks/use-popover-dismiss";
import { llmThreadTitlesEnabled } from "@/lib/feature-flags";
import { currentTaskBot, openBotThread, useStore, type Bot, type Task } from "@/state/store";
import { useMenuMotion } from "./MenuMotion";
import { anchoredMenuPosition } from "./SidebarPopoverMenu";
import { SidebarPopoverMenu, type SidebarMenuItem } from "./SidebarPopoverMenu";
import { isArchived, isWorking, orderedThreadList, splitArchivedThreads, threadRecency, threadRowActions, threadUpdatedLabel } from "./SidebarThreadRow";
import { ConfirmDialog } from "./ConfirmDialog";
import { SIMPLE_ROW_FOCUS } from "./SidebarSimpleTop";
import { displayTitle, chipStatus } from "./ChatThreadBar";

type RowTask = Task & { queued?: boolean };

/** The current thread's switcher: a two-line list of every thread in this conversation, with its actions one layer down. */
export function ThreadSwitcher({ open, anchorRef, bot, onClose }: {
  open: boolean;
  anchorRef: RefObject<HTMLButtonElement | null>;
  bot: Bot;
  onClose: (refocus: boolean) => void;
}) {
  const { state, dispatch } = useStore();
  const generatedTitles = llmThreadTitlesEnabled(state.config);
  const actions = useMemo(() => threadRowActions(bot.id, dispatch, generatedTitles), [bot.id, dispatch, generatedTitles]);
  const threads: RowTask[] = useMemo(() => {
    const openThread = currentTaskBot(bot);
    return orderedThreadList(
      (bot.tasks ?? []).filter((task) => !task.routineRunId && (!isArchived(task) || task.threadId === bot.threadId)),
    ).map((task) => {
      const live = task.threadId === bot.threadId ? openThread : null;
      return {
        ...task,
        busy: live ? live.busy : Boolean(task.busy),
        activity: live ? live.activity : task.activity,
        waitingForTeammates: live ? live.waitingForTeammates : task.waitingForTeammates,
        queued: Boolean(state.pendingQueued[task.threadId]?.length),
      };
    });
  }, [bot, state.pendingQueued]);

  const motion = useMenuMotion(open);
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [deleting, setDeleting] = useState<RowTask | null>(null);
  // The chip that opened it counts as inside: a second press closes it through its own toggle instead of the
  // outside-press dismiss closing it and the click opening it again.
  const inside = useRef({ contains: (target: unknown) => panelRef.current?.contains(target as Node) === true || anchorRef.current?.contains(target as Node) === true });
  usePopoverDismiss(open, inside, () => onClose(true));

  useLayoutEffect(() => {
    if (!motion.shown) { setPosition(null); return; }
    const place = () => {
      const anchor = anchorRef.current, panel = panelRef.current;
      if (!anchor || !panel) return;
      const box = anchor.getBoundingClientRect();
      const rtl = getComputedStyle(anchor).direction === "rtl";
      const next = anchoredMenuPosition(box, { width: panel.offsetWidth, height: panel.offsetHeight }, { width: window.innerWidth, height: window.innerHeight }, rtl);
      setPosition({ left: next.left, top: Math.max(8, Math.min(next.top, window.innerHeight - panel.offsetHeight - 8)) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef, motion.shown, threads.length]);

  // Land on the current thread's row when the sheet opens.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const current = listRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
      (current ?? listRef.current?.querySelector<HTMLElement>("[data-thread-row]"))?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!motion.shown) return null;

  const current = bot.threadId;
  // Archived threads are their own group, never mixed into the list above it.
  const { open: openThreads, archived: archivedThreads } = splitArchivedThreads(threads);
  const renderRow = (task: RowTask) => {
    const isCurrent = task.threadId === current;
    const status = chipStatus(task);
    const waiting = task.activity === "waiting-on-you";
    const time = threadUpdatedLabel(threadRecency(task), Date.now());
    return (
      <li key={task.threadId}>
        <div className={cn("group/thread relative flex min-w-0 items-center rounded-md", isCurrent ? "bg-menu-active" : "hover:bg-menu-hover")}>
          <button
            type="button"
            data-thread-row={task.threadId}
            data-switcher-focus={task.threadId}
            aria-current={isCurrent ? "true" : undefined}
            tabIndex={isCurrent ? 0 : -1}
            onClick={() => { openBotThread(dispatch, bot, task.threadId, false); onClose(true); }}
            className={cn(
              "flex h-11 min-w-0 flex-1 items-center gap-1.5 rounded-md pl-2 pr-1 text-left",
              SIMPLE_ROW_FOCUS,
            )}
          >
            <span className="flex w-2 shrink-0 items-center justify-center" aria-hidden="true">
              {waiting ? <span className="size-1.5 rounded-full bg-warning" /> : <span className="size-1.5 rounded-full bg-ink-tertiary/50" />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span dir="auto" className={cn("truncate text-[13px] leading-[18px] text-ink", isCurrent ? "font-semibold" : "font-medium")}>{displayTitle(task)}</span>
              <span className="flex min-w-0 items-center gap-1 text-[12px] leading-4">
                <span className="shrink-0 whitespace-nowrap text-ink-tertiary">{time}</span>
                <span className="shrink-0 text-ink-tertiary" aria-hidden="true">·</span>
                <span title={status} className={cn("min-w-0 truncate", waiting ? "text-warning" : isCurrent ? "text-ink-secondary" : "text-ink-tertiary")}>{status}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              {isCurrent && <Check size={12} aria-hidden="true" className="text-accent" />}
            </span>
          </button>
          <div className="mr-0.5 shrink-0">
            <SidebarPopoverMenu
              items={rowMenu(task)}
              compact
              ariaLabel={t("task.actions", { title: displayTitle(task) })}
              triggerLabel={t("task.actions", { title: displayTitle(task) })}
              triggerClassName="flex size-[30px] items-center justify-center rounded-md text-ink-tertiary hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
              renderTrigger={() => <MoreHorizontal size={14} />}
            />
          </div>
        </div>
      </li>
    );
  };
  const rowMenu = (task: RowTask): SidebarMenuItem[] => {
    const archived = isArchived(task);
    const working = isWorking(task);
    return [
      {
        key: "archive",
        label: archived ? t("task.unarchive") : t("task.archive"),
        icon: archived ? <ArchiveRestore size={14} /> : <Archive size={14} />,
        disabled: working,
        onSelect: () => actions.onArchive(task, archived ? null : Date.now()),
      },
      { key: "delete", label: t("thread.menu.delete"), icon: <Trash2 size={14} />, danger: true, separatorBefore: true, disabled: working, onSelect: () => setDeleting(task) },
    ];
  };

  return createPortal(
    <div
      ref={panelRef}
      id="thread-switcher"
      role="dialog"
      aria-labelledby={headingId}
      data-thread-switcher
      style={{ position: "fixed", left: position?.left ?? 8, top: position?.top ?? 8, maxHeight: "calc(100vh - 16px)", visibility: position ? undefined : "hidden" }}
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          // Tab moves through the panel's own controls; wrap at the ends so it never falls behind the sheet.
          const focusables = [...(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])') ?? [])]
            .filter((element) => element.tabIndex !== -1 || element === document.activeElement);
          if (!focusables.length) return;
          const first = focusables[0]!, last = focusables[focusables.length - 1]!;
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          return;
        }
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        const items = [...(panelRef.current?.querySelectorAll<HTMLElement>("[data-switcher-focus]") ?? [])];
        if (!items.length) return;
        const at = items.indexOf(document.activeElement as HTMLElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (at + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }}
      className={cn(
        "popover-surface z-[60] flex w-[17.5rem] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-[var(--radius-menu)] border border-hairline/50 bg-menu p-1.5 pb-2 shadow-lg [&_svg.lucide]:stroke-[1.5]",
        motion.className,
      )}
      {...motion.exitProps}
    >
      <div className="mb-1.5 flex h-7 shrink-0 items-center justify-between px-2 text-[12px] font-medium leading-4 text-ink-tertiary">
        <span id={headingId}>{t("task.list")}</span>
        <span className="tabular-nums">{threads.length}</span>
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ maxHeight: "20rem" }}>
        {threads.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] leading-4 text-ink-tertiary">{t("thread.switcher.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {openThreads.map(renderRow)}
            {archivedThreads.length > 0 && (
              <>
                <li role="presentation" data-thread-switcher-archived="" className="px-2 pb-1 pt-2 text-[11px] font-medium leading-4 text-ink-tertiary">{t("task.archived")}</li>
                {archivedThreads.map(renderRow)}
              </>
            )}
          </ul>
        )}
      </div>
      {deleting && (
        <ConfirmDialog
          open
          title={t("task.deleteConfirm")}
          body={t("task.deleteBody", { title: displayTitle(deleting) })}
          confirmLabel={t("task.deleteAria")}
          onCancel={() => setDeleting(null)}
          onConfirm={() => { actions.onDelete(deleting); setDeleting(null); onClose(true); }}
        />
      )}
    </div>,
    document.body,
  );
}
