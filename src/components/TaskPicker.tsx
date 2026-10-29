import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Check, FolderInput, Plus, Search, Trash2 } from "lucide-react";
import { useStore, type Bot, type BotProject, type Group, type Task } from "@/state/store";
import { cn } from "@/lib/cn";
import { roomThreadsWorkingElsewhere } from "@/lib/room-threads";
import { useMenuMotion } from "./MenuMotion";
import { t } from "@/lib/i18n";
import { localizedTaskTitle } from "@/lib/task-title";
import { COMPACT_BUBBLE } from "@/lib/compact-chip";
import { formatTaskTokens, headlineTokens, usageDetail } from "@/lib/usage";
import { FolderIcon, NewThreadButton } from "./BotProjects";
import { useShowThreads } from "@/lib/thread-preferences";
import { useAdvancedMode } from "@/lib/interface-mode";
import { attentionJumpAction, attentionOwnerName, AttentionThreadRows, crossBotAttentionThreads, threadsWhenTreeHidden, type AttentionThread } from "./SidebarBotActivity";
import { formatUpdatedAt, orderedThreadList, threadByline, threadRecency, threadUpdatedLabel, useRelativeNow } from "./SidebarThreadRow";
import { Select } from "./Select";
import { Chevron } from "./chevron";

/** Advanced keeps the old hidden chevron below the chathead breakpoint; Simple shows it so the switch is named. */
export function taskPickerChevronClass(advanced: boolean): string {
  return cn("shrink-0", advanced && "@max-4xl/chathead:hidden");
}

export const TASK_PICKER_DISMISS_MS = 500;


/** The click that accompanies a dblclick has detail >= 2 and must not switch or close. */
export function taskPickerPointerIntent(
  type: string,
  detail = 1,
): "select" | "rename" | "ignore" {
  if (type === "dblclick" || type === "contextmenu") return "rename";
  if (type === "click" && detail >= 2) return "ignore";
  if (type === "click") return "select";
  return "ignore";
}

export function filterTasks<T extends { title: string }>(tasks: readonly T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...tasks];
  const prefix: T[] = [];
  const substring: T[] = [];
  for (const task of tasks) {
    const title = task.title.toLowerCase();
    if (title.startsWith(needle)) prefix.push(task);
    else if (title.includes(needle)) substring.push(task);
  }
  return [...prefix, ...substring];
}

function TaskUpdatedTime({ task, now }: { task: { updatedAt?: number; createdAt?: number }; now: number }) {
  const stamp = threadRecency(task);
  if (!Number.isFinite(stamp) || stamp <= 0) return null;
  return <time dateTime={new Date(stamp).toISOString()} title={formatUpdatedAt(stamp)}>{threadUpdatedLabel(stamp, now)}</time>;
}

function TaskUsage({ usage }: { usage: Task["usage"] }) {
  if (!usage) return null;
  const label = formatTaskTokens(headlineTokens(usage));
  if (!label) return null;
  return (
    <span
      title={usageDetail(usage)}
    >
      {" · "}
      {label}
    </span>
  );
}

type PickerTask = Pick<Task, "threadId" | "title" | "createdAt" | "updatedAt" | "pinned" | "busy" | "activity" | "unread" | "projectId" | "openedBy" | "closedBy" | "archivedAt" | "snoozedUntil" | "waitingForTeammates"> & { usage?: Task["usage"] };

export function groupThreadTasks(tasks: PickerTask[], projects: BotProject[], query: string) {
  const needle = query.trim().toLowerCase();
  return [...projects, { id: "", name: t("folder.none") } as BotProject].map((project) => {
    const members = tasks.filter((task) => project.id ? task.projectId === project.id : !projects.some((item) => item.id === task.projectId));
    return { project, tasks: project.name.toLowerCase().includes(needle) ? members : filterTasks(members, query) };
  }).filter((group) => group.tasks.length > 0);
}

function ConversationTaskPicker({
  threadId,
  tasks,
  busy,
  bot,
  onNew,
  onSwitch,
  onDelete,
  onMove,
  attention,
  onAttentionJump,
  workingElsewhere = 0,
}: {
  threadId: string;
  tasks: PickerTask[];
  busy: boolean;
  workingElsewhere?: number;
  bot?: Bot;
  onNew: () => void;
  onSwitch: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  onMove?: (threadId: string, projectId: string | null) => void;
  attention?: AttentionThread[];
  onAttentionJump?: (entry: AttentionThread) => void;
}) {
  const advanced = useAdvancedMode();
  const [open, setOpen] = useState(false);
  const motion = useMenuMotion(open);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const now = useRelativeNow();

  const current = tasks.find((t) => t.threadId === threadId);

  const clearDismiss = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  };

  const closeMenu = () => {
    clearDismiss();
    setQuery("");
    setOpen(false);
  };

  const queueDismiss = () => {
    clearDismiss();
    dismissTimer.current = setTimeout(() => {
      dismissTimer.current = null;
      setOpen(false);
    }, TASK_PICKER_DISMISS_MS);
  };

  useEffect(() => () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
  }, []);

  useEffect(() => {
    if (!open) {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
      setQuery("");
      return;
    }
    const onDown = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest("[data-thread-overlay]")) return;
      // SAFETY: a mousedown target inside a document is always a DOM Node
      if (!ref.current?.contains(e.target as Node)) {
        if (dismissTimer.current) {
          clearTimeout(dismissTimer.current);
          dismissTimer.current = null;
        }
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (e.target instanceof Element && e.target.closest("[data-thread-overlay]")) return;
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
      setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const u = current?.usage;
  const currentLabel = u ? formatTaskTokens(headlineTokens(u)) : null;
  const switchTitle =
    u && currentLabel
      ? t("task.switchWithUsageDetail", {
          label: currentLabel,
          detail: usageDetail(u),
        })
      : t("task.switch");
  const grouped = bot ? groupThreadTasks(tasks, bot.projects ?? [], query) : null;
  const visible = grouped ? grouped.flatMap((group) => group.tasks) : filterTasks(tasks, query);
  const attentionNeedle = query.trim().toLowerCase();
  const attentionRows = (attention ?? []).filter((entry) =>
    !attentionNeedle || entry.task.title.toLowerCase().includes(attentionNeedle) || attentionOwnerName(entry).toLowerCase().includes(attentionNeedle));
  const looking = query.trim();
  const results = [...attentionRows.map((entry) => ({ kind: "attention" as const, entry })), ...visible.map((task) => ({ kind: "task" as const, task }))];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          if (open) closeMenu();
          else setOpen(true);
        }}
        title={switchTitle}
        aria-label={t("task.switch")}
        className={cn(
          "flex max-w-[220px] items-center gap-1.5 rounded-full border border-hairline/40 px-2.5 py-1 text-[13px] text-ink-secondary hover:bg-raised hover:text-ink",
          COMPACT_BUBBLE,
        )}
      >
        <span className="truncate @max-4xl/chathead:hidden">{t("task.switch")}</span>
        <span className="shrink-0 tabular-nums opacity-60 @max-4xl/chathead:opacity-100">{tasks.length}</span>
        {workingElsewhere > 0 && (
          <span
            role="img"
            data-working-elsewhere={workingElsewhere}
            aria-label={t("task.workingElsewhere", { count: workingElsewhere })}
            title={t("task.workingElsewhere", { count: workingElsewhere })}
            className="size-1.5 shrink-0 animate-pulse rounded-full bg-accent"
          />
        )}
        <Chevron kind="menu" size="inline" className={taskPickerChevronClass(advanced)} />
      </button>

      {motion.shown && (
        <div className={cn("popover-surface absolute right-0 top-full z-40 mt-1 w-[300px] overflow-hidden rounded-xl border border-hairline/50 bg-card py-1 shadow-2xl shadow-black/50", motion.className)} {...motion.exitProps}>
          <div className="px-2 pb-1 pt-1.5">
            <div className="flex items-center gap-2 rounded-lg border border-hairline/40 bg-inset px-2.5 py-1.5 focus-within:border-focus">
              <Search size={13} className="shrink-0 text-ink-secondary" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    if (looking) setQuery("");
                    else closeMenu();
                    return;
                  }
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    const first = results[0];
                    if (!first) return;
                    if (first.kind === "attention") onAttentionJump?.(first.entry);
                    else if (first.task.threadId !== threadId) onSwitch(first.task.threadId);
                    closeMenu();
                  }
                }}
                placeholder={t("task.search")}
                aria-label={t("task.search")}
                className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-secondary focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-[320px] overflow-y-auto" role="group" aria-label={looking ? t("task.matching", { count: results.length }) : t("task.list")}>
            {attentionRows.length > 0 && <div className="pb-1">
              <div className="flex items-center gap-1.5 px-3 pb-1 pt-1.5 text-[11px] font-medium text-ink-secondary"><Activity size={12} />{t("attention.title")}</div>
              <AttentionThreadRows entries={attentionRows} onJump={(entry) => { onAttentionJump?.(entry); closeMenu(); }} />
            </div>}
            {results.length === 0 ? (
              <div className="px-3 py-6 text-center text-[13px] text-ink-secondary">
                {t("task.noMatch", { query: looking })}
              </div>
            ) : visible.map((task, index) => {
              const active = task.threadId === threadId;
              const opener = threadByline(task);
              const heading = grouped?.find((group) => group.tasks[0]?.threadId === task.threadId)?.project;
              return (
                <Fragment key={task.threadId}>
                {bot?.projects?.length && heading ? <div className={cn("flex items-center gap-1.5 px-3 pb-1 pt-2 text-[11px] font-medium text-ink-secondary", index > 0 && "border-t border-hairline/30")}>{heading.id && <FolderIcon emoji={heading.emoji} size={12} />}{heading.name}</div> : null}
                <div
                  className={cn("group flex items-center gap-2 px-2.5 py-2", active ? "bg-raised/60" : "hover:bg-raised/40")}
                >
                  <Check size={13} className={cn("shrink-0", active ? "text-accent" : "opacity-0")} />
                  <button
                    type="button"
                    onClick={(e) => {
                      if (taskPickerPointerIntent("click", e.detail) !== "select") return;
                      if (!active) onSwitch(task.threadId);
                      queueDismiss();
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div dir="auto" className="truncate text-[13px] text-ink">{localizedTaskTitle(task.title)}</div>
                    <div className="text-[11px] text-ink-secondary">
                      {task.activity === "waiting-on-you" ? `${t("task.waiting")} · ` : task.waitingForTeammates ? `${t("task.waitingOnTeammate")} · ` : task.busy ? `${t("chat.activity.working")} · ` : task.unread ? `${t("task.unread")} · ` : ""}
                      <TaskUpdatedTime task={task} now={now} />
                      <TaskUsage usage={task.usage} />
                      {opener && ` · ${opener}`}
                    </div>
                  </button>
                  {bot && onMove && (bot.projects?.length ?? 0) > 0 && <label title={t("folder.move")} className="relative rounded p-1 text-ink-secondary opacity-0 hover:bg-raised hover:text-ink focus-within:opacity-100 group-hover:opacity-100 touch:opacity-70">
                    <FolderInput size={13} />
                    <select aria-label={t("folder.moveNamed", { title: task.title })} value={bot.projects?.some((project) => project.id === task.projectId) ? task.projectId : ""}
                      onFocus={clearDismiss} onChange={(event) => { clearDismiss(); onMove(task.threadId, event.target.value || null); }}
                      className="absolute inset-0 w-full cursor-pointer opacity-0">
                      <option value="">{t("folder.none")}</option>
                      {bot.projects?.map((project) => <option key={project.id} value={project.id}>{project.emoji ? `${project.emoji} ` : ""}{project.name}</option>)}
                    </select>
                  </label>}
                  <button
                    type="button"
                    onClick={() => onDelete(task.threadId)}
                    disabled={Boolean(task.busy) || busy && active}
                    aria-label={t("task.deleteAria")}
                    title={t("task.deleteTitle")}
                    className="rounded p-1 text-ink-secondary opacity-0 hover:bg-raised hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-ink-secondary touch:opacity-70 touch:disabled:opacity-20"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                </Fragment>
              );
            })}
          </div>
          {bot ? <NewThreadButton bot={bot} onCreated={closeMenu} className="mt-1 w-full rounded-none border-t border-hairline/40" /> : <button
            type="button"
            onClick={() => {
              onNew();
              closeMenu();
            }}
            disabled={busy}
            className="mt-1 flex w-full items-center gap-2 border-t border-hairline/40 px-3 py-2 text-left text-[13px] text-ink hover:bg-raised/50 disabled:opacity-40"
          >
            <Plus size={13} className="text-ink-secondary" /> {t("task.newShort")}
          </button>}
        </div>
      )}
    </div>
  );
}

export function BotActivityPicker({ bot }: { bot: Bot }) {
  const { state, dispatch } = useStore();
  const showThreads = useShowThreads();
  if (showThreads) return null;
  const activity = threadsWhenTreeHidden(bot, state.pendingQueued).filter((task) => task.threadId !== bot.threadId);
  if (!activity.length) return null;
  return (
    <div className="flex shrink-0 items-center gap-2 px-5 py-2" data-background-activity>
      <Select variant="pill" size="sm" className="max-w-[180px] shrink-0"
        aria-label={t("task.otherActivity", { count: activity.length })}
        value=""
        onChange={(event) => dispatch({ type: "switchTask", botId: bot.id, threadId: event.target.value })}
      >
        <option value="" disabled>{t("task.otherActivity", { count: activity.length })}</option>
        {activity.map((task) => <option key={task.threadId} value={task.threadId}>
          {task.title} · {task.activity === "waiting-on-you" ? t("task.waiting") : task.waitingForTeammates ? t("task.waitingOnTeammate") : task.busy || task.activity === "working" ? t("chat.activity.working") : task.queued ? t("task.queued") : t("task.unread")}
        </option>)}
      </Select>
      <span dir="auto" className="truncate text-[12px] text-ink-secondary">{bot.tasks?.find((task) => task.threadId === bot.threadId)?.title}</span>
    </div>
  );
}

export function TaskPicker({ bot }: { bot: Bot }) {
  const { state, dispatch } = useStore();
  const showThreads = useShowThreads();
  if (!showThreads) return null;
  return (
    <ConversationTaskPicker
      threadId={bot.threadId}
      tasks={orderedThreadList((bot.tasks ?? []).filter((task) => !task.routineRunId))}
      busy={false}
      bot={bot}
      attention={crossBotAttentionThreads(state.bots, state.pendingQueued, bot.id, state.groups)}
      onNew={() => dispatch({ type: "newTask", botId: bot.id })}
      onSwitch={(threadId) => dispatch({ type: "switchTask", botId: bot.id, threadId })}
      onDelete={(threadId) => dispatch({ type: "deleteTask", botId: bot.id, threadId })}
      onMove={(threadId, projectId) => dispatch({ type: "updateTask", botId: bot.id, threadId, patch: { projectId } })}
      onAttentionJump={(entry) => dispatch(attentionJumpAction(entry))}
    />
  );
}

export function GroupTaskPicker({ group }: { group: Group }) {
  const { dispatch } = useStore();
  const tasks = useMemo(() => {
    return (group.tasks ?? []).map((task) => ({
      ...task,
      busy: Boolean(task.working || task.busyBotId),
    }));
  }, [group.tasks]);
  return (
    <ConversationTaskPicker
      threadId={group.threadId}
      tasks={orderedThreadList(tasks)}
      busy={false}
      workingElsewhere={roomThreadsWorkingElsewhere(group)}
      onNew={() => dispatch({ type: "newGroupTask", groupId: group.id })}
      onSwitch={(threadId) => dispatch({ type: "switchGroupTask", groupId: group.id, threadId })}
      onDelete={(threadId) => dispatch({ type: "deleteGroupTask", groupId: group.id, threadId })}
    />
  );
}
