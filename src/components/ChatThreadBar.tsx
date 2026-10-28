import { useRef, useState } from "react";
import { Clock, Loader2, MessageSquare } from "lucide-react";

import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { spinnerColor } from "@/lib/mascot";
import { localizedTaskTitle } from "@/lib/task-title";
import { isArchived, isWorking } from "./SidebarThreadRow";
import { useStore, type Bot, type Task } from "@/state/store";
import { Chevron } from "./chevron";
import { ELEVATED_FLOAT, ELEVATED_HOVER } from "./elevated";
import { SIMPLE_ROW_FOCUS } from "./SidebarSimpleTop";
import { ThreadSwitcher } from "./ThreadSwitcher";

type BarTask = Task & { queued?: boolean };

export const displayTitle = (task: BarTask) => localizedTaskTitle(task.title || t("task.newShort"));

/** What the chip says besides its name, in words for a reader. */
export function chipStatus(task: BarTask): string {
  if (task.activity === "waiting-on-you") return t("task.waiting");
  if (isWorking(task)) return t("chat.activity.working");
  if (task.waitingForTeammates) return t("task.waitingOnTeammate");
  if (task.queued) return t("task.queued");
  return task.unread ? t("task.unread") : "";
}

/** True when the header shows the chip: an open thread that is not a routine run. An archived thread keeps its chip. */
export function chatThreadChipShown(bot: Bot): boolean {
  const active = (bot.tasks ?? []).find((task) => task.threadId === bot.threadId);
  return Boolean(active && !active.routineRunId);
}

/** The one current-thread pill: names the conversation and opens the switcher. */
export function ChatThreadChip({ bot }: { bot: Bot }) {
  const { state } = useStore();
  const chipRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const task = (bot.tasks ?? []).find((entry) => entry.threadId === bot.threadId);
  if (!task) return null;
  const queued = Boolean(state.pendingQueued[task.threadId]?.length);
  const live = queued ? { ...task, queued } : task;
  const title = displayTitle(live);
  const status = chipStatus(live);
  const waiting = live.activity === "waiting-on-you";
  const working = isWorking(live) && !waiting;
  const archived = isArchived(live);

  return (
    <>
      <button
        ref={chipRef}
        type="button"
        data-thread-chip-bar
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? "thread-switcher" : undefined}
        title={status ? `${title} · ${status}` : title}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          setOpen(true);
        }}
        className={cn(
          "group flex h-8 min-w-[8rem] w-fit max-w-[min(12.5rem,100%)] items-center gap-1.5 rounded-full pl-2.5 pr-2 text-[13px] leading-[18px] text-ink",
          ELEVATED_FLOAT,
          ELEVATED_HOVER,
          SIMPLE_ROW_FOCUS,
        )}
      >
        <span className="flex size-3.5 shrink-0 items-center justify-center" aria-hidden="true">
          {waiting
            ? <Clock size={14} className="text-warning" />
            : working
              ? <Loader2 size={14} className="animate-spin" style={{ color: spinnerColor(bot.color) }} />
              : <MessageSquare size={14} className="text-ink-tertiary" />}
        </span>
        <span dir="auto" className="min-w-0 flex-1 truncate">{title}</span>
        {status && <span className="sr-only">{status}</span>}
        {archived && <span className="sr-only">{t("task.unarchive")}</span>}
        <Chevron kind="menu" open={open} size="inline" className="text-ink-tertiary" />
      </button>
      <ThreadSwitcher open={open} anchorRef={chipRef} bot={bot} onClose={(refocus) => {
        setOpen(false);
        if (refocus) requestAnimationFrame(() => chipRef.current?.focus());
      }} />
    </>
  );
}
