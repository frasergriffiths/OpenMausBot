import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Archive, Clock, Loader2, MessageSquare, Plus, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { spinnerColor } from "@/lib/mascot";
import { openBotThread, useStore, type Bot } from "@/state/store";
import { chipStatus, displayTitle } from "./ChatThreadBar";
import { isArchived, isWorking } from "./SidebarThreadRow";
import { ThreadSwitcher } from "./ThreadSwitcher";

const TAB_BOX = "group relative flex h-8 min-w-[8rem] max-w-52 shrink-0 items-center gap-1 rounded-xl pl-2 pr-0.5 text-[12px] leading-4 text-ink-secondary";
const NO_DRAG = { WebkitAppRegion: "no-drag" } as CSSProperties;
const FOCUS = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus";
const ICON_BUTTON = "flex size-7 shrink-0 items-center justify-center rounded-lg text-ink-secondary hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus";

/** The title-bar switcher as browser tabs: one tab per conversation, a pinned "+" and the archived list. It only
 *  draws when the appearance setting is "tabs"; the pill is ChatThreadChip and is untouched. */
export function ChatThreadTabs({ bot }: { bot: Bot }) {
  const { state, dispatch } = useStore();
  // The pill's rule: an archived thread is not a tab unless it is the one open.
  const tasks = (bot.tasks ?? []).filter((task) => !task.routineRunId && (!isArchived(task) || task.threadId === bot.threadId));
  const current = bot.threadId;
  const [archivedOpen, setArchivedOpen] = useState(false);
  const archivedRef = useRef<HTMLButtonElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [current]);

  const select = (threadId: string) => openBotThread(dispatch, bot, threadId, false);
  const focusActive = () => {
    requestAnimationFrame(() => {
      const active = listRef.current?.querySelector<HTMLElement>('[data-thread-tab][aria-selected="true"]');
      (active ?? plusRef.current)?.focus();
    });
  };
  const archive = (task: (typeof tasks)[number]) => {
    if (isWorking(task)) return;
    if (task.threadId === current) {
      const next = tasks.find((candidate) => candidate.threadId !== task.threadId && !isArchived(candidate));
      if (next) select(next.threadId);
    }
    dispatch({ type: "updateTask", botId: bot.id, threadId: task.threadId, patch: { archivedAt: Date.now() } });
    focusActive();
  };

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const at = (next: number) => {
      const task = tasks[next];
      if (!task) return;
      event.preventDefault();
      select(task.threadId);
      const node = listRef.current?.querySelectorAll<HTMLButtonElement>("[data-thread-tab]")[next];
      node?.focus();
    };
    if (event.key === "ArrowRight") return at(Math.min(tasks.length - 1, index + 1));
    if (event.key === "ArrowLeft") return at(Math.max(0, index - 1));
    if (event.key === "Home") return at(0);
    if (event.key === "End") return at(tasks.length - 1);
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      archive(tasks[index]!);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(tasks[index]!.threadId);
    }
  };

  const currentTask = tasks.find((task) => task.threadId === current);
  const activeStatus = currentTask ? chipStatus({ ...currentTask, queued: (state.pendingQueued?.[currentTask.threadId]?.length ?? 0) > 0 }) : "";

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <div
        ref={listRef}
        role="tablist"
        aria-label={t("task.list")}
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tasks.map((task, index) => {
          const active = task.threadId === current;
          const archived = isArchived(task);
          const waiting = task.activity === "waiting-on-you";
          const working = isWorking(task) && !waiting;
          const queued = state.pendingQueued?.[task.threadId]?.length ?? 0;
          const title = displayTitle(task);
          const status = chipStatus({ ...task, queued: queued > 0 });
          return (
            <div
              key={task.threadId}
              ref={active ? activeRef : undefined}
              data-thread-tab-box={task.threadId}
              className={cn(TAB_BOX, active ? "bg-inset text-ink" : "hover:bg-ink/[0.04]")}
              style={NO_DRAG}
            >
              <span className="relative flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
                {waiting ? <Clock size={13} className="text-warning" />
                  : working ? <Loader2 size={13} className="animate-spin" style={{ color: spinnerColor(bot.color) }} />
                    : queued > 0 ? <span className="flex size-4 items-center justify-center rounded-full bg-ink/[0.08] text-[10px] font-medium tabular-nums text-ink">{queued > 9 ? "9+" : queued}</span>
                      : archived ? <Archive size={13} className="text-ink-tertiary" />
                        : <MessageSquare size={13} className="text-ink-tertiary" />}
                {task.unread && !active && <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-accent" />}
              </span>
              <button
                type="button"
                role="tab"
                data-thread-tab={task.threadId}
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                aria-keyshortcuts="Delete"
                aria-label={status ? `${title}. ${status}` : title}
                title={status ? `${title} · ${status}` : title}
                onClick={() => select(task.threadId)}
                onKeyDown={(event) => onTabKey(event, index)}
                className={cn("min-w-0 flex-1 truncate px-0.5 text-left", FOCUS)}
              >
                <span dir="auto">{title}</span>
              </button>
              <button
                type="button"
                tabIndex={active ? 0 : -1}
                disabled={working}
                aria-label={t("sidebar.bot.archiveAria", { name: title })}
                title={t("task.archive")}
                onClick={() => archive(task)}
                className={cn("flex size-6 shrink-0 items-center justify-center rounded-md text-ink-secondary hover:bg-inset hover:text-ink disabled:cursor-not-allowed disabled:opacity-50", FOCUS)}
              >
                <X size={13} aria-hidden="true" />
              </button>
            </div>
          );
        })}
        <span role="status" className="sr-only">{activeStatus}</span>
      </div>
      <button
        ref={plusRef}
        type="button"
        data-thread-new=""
        aria-label={t("task.newShort")}
        title={t("task.newShort")}
        onClick={() => dispatch({ type: "newTask", botId: bot.id })}
        className={ICON_BUTTON}
        style={NO_DRAG}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
      <button
        ref={archivedRef}
        type="button"
        data-thread-archived=""
        aria-haspopup="dialog"
        aria-expanded={archivedOpen}
        aria-label={t("task.archived")}
        title={t("task.archived")}
        onClick={() => setArchivedOpen((open) => !open)}
        className={ICON_BUTTON}
        style={NO_DRAG}
      >
        <Archive size={15} aria-hidden="true" />
      </button>
      {archivedOpen && (
        <ThreadSwitcher open anchorRef={archivedRef} bot={bot} scope="archived" onClose={(refocus) => { setArchivedOpen(false); if (refocus) archivedRef.current?.focus(); }} />
      )}
    </div>
  );
}
