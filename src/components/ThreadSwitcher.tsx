import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Archive, ArchiveRestore, Check, MoreHorizontal, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { nextRename } from "@/lib/rename";
import { usePopoverDismiss } from "@/hooks/use-popover-dismiss";
import { llmThreadTitlesEnabled } from "@/lib/feature-flags";
import { currentTaskBot, openBotThread, useStore, type Bot, type Task } from "@/state/store";
import { MENU_ROW } from "./menu-recipe";
import { useMenuMotion } from "./MenuMotion";
import { anchoredMenuPosition } from "./SidebarPopoverMenu";
import { SidebarPopoverMenu, type SidebarMenuItem } from "./SidebarPopoverMenu";
import { isArchived, isWorking, orderedThreadList, threadRecency, threadRowActions, threadUpdatedLabel } from "./SidebarThreadRow";
import { ConfirmDialog } from "./ConfirmDialog";
import { SIMPLE_ROW_FOCUS } from "./SidebarSimpleTop";
import { displayTitle, chipStatus } from "./ChatThreadBar";

type RowTask = Task & { queued?: boolean };
const SEPARATOR = "mx-2 my-[5px] h-[0.5px] shrink-0 bg-ink/10";

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
  const menuId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [deleting, setDeleting] = useState<RowTask | null>(null);
  const finishing = useRef(false);
  const inside = useRef({ contains: (target: unknown) => panelRef.current?.contains(target as Node) === true });
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
  const finishRename = (task: RowTask, save: boolean) => {
    if (finishing.current) return;
    finishing.current = true;
    const next = save ? nextRename(task.title, draft) : null;
    setRenaming(null);
    if (next) actions.onRename(task, next);
  };

  const rowMenu = (task: RowTask): SidebarMenuItem[] => {
    const archived = isArchived(task);
    const working = isWorking(task);
    return [
      { key: "rename", label: t("task.renameAria"), icon: <Pencil size={14} />, onSelect: () => { setDraft(task.title); setRenaming(task.threadId); } },
      {
        key: "pin",
        label: task.pinned === true ? t("sidebar.bot.unpin") : t("sidebar.bot.pin"),
        icon: task.pinned === true ? <PinOff size={14} /> : <Pin size={14} />,
        onSelect: () => actions.onPin(task, task.pinned !== true),
      },
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
      id={menuId}
      role="dialog"
      aria-labelledby={headingId}
      data-thread-switcher
      style={{ position: "fixed", left: position?.left ?? 8, top: position?.top ?? 8, maxHeight: "calc(100vh - 16px)", visibility: position ? undefined : "hidden" }}
      onKeyDown={(event) => {
        if (event.key === "Tab") { event.preventDefault(); onClose(true); return; }
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        const items = [...(panelRef.current?.querySelectorAll<HTMLElement>("[data-switcher-focus]") ?? [])];
        if (!items.length) return;
        const at = items.indexOf(document.activeElement as HTMLElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (at + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }}
      className={cn(
        "popover-surface z-[60] flex w-[17.5rem] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-[var(--radius-menu)] border border-hairline/50 bg-menu p-1.5 shadow-lg [&_svg.lucide]:stroke-[1.5]",
        motion.className,
      )}
      {...motion.exitProps}
    >
      <div className="flex h-7 shrink-0 items-center justify-between px-2 text-[12px] font-medium leading-4 text-ink-tertiary">
        <span id={headingId}>{t("task.list")}</span>
        <span className="tabular-nums">{threads.length}</span>
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ maxHeight: "20rem" }}>
        {threads.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] leading-4 text-ink-tertiary">{t("thread.switcher.empty")}</p>
        ) : (
          <ul className="flex flex-col">
            {threads.map((task) => {
              const isCurrent = task.threadId === current;
              const status = chipStatus(task);
              const waiting = task.activity === "waiting-on-you";
              const time = threadUpdatedLabel(threadRecency(task), Date.now());
              return (
                <li key={task.threadId}>
                  <div className={cn("group/thread relative flex min-w-0 items-center rounded-md", isCurrent ? "bg-menu-active" : "hover:bg-menu-hover")}>
                    {renaming === task.threadId ? (
                      <div className="flex h-10 min-w-0 flex-1 items-center gap-2 pl-2 pr-1">
                        <span className="flex size-4 shrink-0" />
                        <input
                          autoFocus
                          value={draft}
                          maxLength={80}
                          dir="auto"
                          aria-label={t("task.renameAria")}
                          onFocus={(event) => event.currentTarget.select()}
                          onChange={(event) => setDraft(event.target.value)}
                          onBlur={() => finishRename(task, true)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); finishRename(task, true); }
                            else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finishRename(task, false); }
                          }}
                          className="h-7 w-full min-w-0 rounded-md border border-accent/50 bg-inset px-2 text-[13px] leading-4 text-ink outline-none"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        data-thread-row={task.threadId}
                        data-switcher-focus={task.threadId}
                        aria-current={isCurrent ? "true" : undefined}
                        tabIndex={isCurrent ? 0 : -1}
                        onClick={() => { openBotThread(dispatch, bot, task.threadId, false); onClose(false); }}
                        className={cn(
                          "flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md pl-2 pr-1 text-left focus:bg-ink/[0.06]",
                          SIMPLE_ROW_FOCUS,
                        )}
                      >
                        <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
                          {waiting ? <span className="size-1.5 rounded-full bg-warning" /> : <span className="size-1.5 rounded-full bg-ink-tertiary/50" />}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span dir="auto" className={cn("truncate text-[13px] leading-[18px] text-ink", isCurrent ? "font-semibold" : "font-medium")}>{displayTitle(task)}</span>
                          <span className="flex min-w-0 items-center gap-1 text-[12px] leading-4">
                            <span className="min-w-0 truncate text-ink-tertiary">{time} ·</span>
                            <span className={cn("shrink-0", waiting ? "text-warning" : isCurrent ? "text-ink-secondary" : "text-ink-tertiary")}>{status}</span>
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {isCurrent && <Check size={12} aria-hidden="true" className="text-accent" />}
                          {task.pinned === true && <><Pin size={12} aria-hidden="true" className="text-ink-tertiary" /><span className="sr-only">{t("sidebar.bot.pin")}</span></>}
                        </span>
                      </button>
                    )}
                    <div className="mr-0.5 shrink-0">
                      <SidebarPopoverMenu
                        items={rowMenu(task)}
                        compact
                        ariaLabel={t("task.actions", { title: displayTitle(task) })}
                        triggerLabel={t("task.actions", { title: displayTitle(task) })}
                        triggerClassName="flex size-7 items-center justify-center rounded-md text-ink-tertiary hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                        placement="below"
                        renderTrigger={() => <MoreHorizontal size={14} />}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div role="separator" className={SEPARATOR} />
      <button
        type="button"
        data-switcher-focus="new"
        tabIndex={-1}
        onClick={() => { dispatch({ type: "newTask", botId: bot.id }); onClose(false); }}
        className={cn("flex h-10 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] font-medium text-ink hover:bg-menu-hover", MENU_ROW, "h-10")}
      >
        <span className="flex size-4 shrink-0 items-center justify-center"><Plus size={14} /></span>
        {t("task.newShort")}
      </button>
      {deleting && (
        <ConfirmDialog
          open
          title={t("task.deleteConfirm")}
          body={t("task.deleteBody", { title: displayTitle(deleting) })}
          confirmLabel={t("task.deleteAria")}
          onCancel={() => setDeleting(null)}
          onConfirm={() => { actions.onDelete(deleting); setDeleting(null); }}
        />
      )}
    </div>,
    document.body,
  );
}
