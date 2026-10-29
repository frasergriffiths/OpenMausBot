import { useMemo, useRef } from "react";
import { useStore, type Group } from "@/state/store";
import { activeLocale, t } from "@/lib/i18n";
import { roomThreadSpeakerId, roomThreadWorking } from "@/lib/room-threads";
import type { SidebarDensity } from "@/lib/sidebar-preferences";
import { orderedThreadList, SidebarThreadRow, stampClock, threadRecency, useRelativeNow, useRevealedThreadRow, visibleSidebarThreads } from "./SidebarThreadRow";

export function GroupThreadList({ group, selected, density = "comfortable", query = "" }: { group: Group; selected: boolean; density?: SidebarDensity; query?: string }) {
  const { state, dispatch } = useStore();
  const now = useRelativeNow();
  const tasks = (group.tasks ?? [{ threadId: group.threadId, title: group.name, createdAt: group.createdAt }]).map((task) => {
    const speakerId = roomThreadSpeakerId(group, task.threadId);
    const waiting = Boolean(speakerId) && state.bots.find((bot) => bot.id === speakerId)?.activity === "waiting-on-you";
    return {
      ...task, busy: roomThreadWorking(group, task.threadId), unread: task.threadId === group.threadId && group.unread,
      activity: waiting ? "waiting-on-you" as const : undefined,
    };
  });
  const visible = orderedThreadList(visibleSidebarThreads(tasks, group.threadId, query));
  useRevealedThreadRow(state.revealThread, selected ? group.threadId : null);
  const latest = useRef(group);
  latest.current = group;
  const groupId = group.id;
  const actions = useMemo(() => ({
    onSelect: (task: { threadId: string }) => {
      if (task.threadId !== latest.current.threadId) dispatch({ type: "switchGroupTask", groupId, threadId: task.threadId });
      else dispatch({ type: "select", id: groupId });
    },
    onDelete: (task: { threadId: string }) => dispatch({ type: "deleteGroupTask", groupId, threadId: task.threadId }),
  }), [groupId, dispatch]);
  const locale = activeLocale();
  return <div className="mb-2 space-y-0.5" role="group" aria-label={t("task.namedList", { name: group.name })}>
    {visible.map((task) => <SidebarThreadRow key={task.threadId} task={task} ownerId={group.id} current={selected && task.threadId === group.threadId} compact={density === "compact"}
      now={stampClock(threadRecency(task), now)} locale={locale} {...actions} />)}
  </div>;
}
