import { t } from "@/lib/i18n";
import { chunkIds, summarizeDelete, type DeleteResponse, type SelectableRow } from "@/lib/bulk-select";
import { api, type Action, type BotAnnouncement, type Group } from "@/state/store";

export type BulkDeleteResult = { responses: DeleteResponse[]; error?: string };
type Selection = ReadonlySet<string>;

/** One request per chunk, in order; a failed chunk stops the rest, and earlier chunks stay deleted. */
export async function deleteThreadsInBulk(owner: { botId: string } | { groupId: string }, threadIds: string[], dispatch: (action: Action) => void): Promise<BulkDeleteResult> {
  const url = "botId" in owner ? `/api/bots/${owner.botId}/tasks/delete` : `/api/groups/${owner.groupId}/tasks/delete`;
  const responses: DeleteResponse[] = [];
  try {
    for (const part of chunkIds(threadIds)) {
      const response = await api<DeleteResponse & { bot?: BotAnnouncement; group?: Partial<Group> & { id: string } }>(url, { method: "POST", body: JSON.stringify({ threadIds: part }) });
      responses.push(response);
      if (response.bot) dispatch({ type: "botPatched", bot: response.bot });
      if (response.group) dispatch({ type: "groupPatched", group: response.group });
    }
    return { responses };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dispatch({ type: "error", message });
    return { responses, error: message };
  }
}

export function bulkDeleteBody(rows: readonly SelectableRow[], selected: Selection, freshConversation: boolean): string {
  const everything = rows.length > 0 && rows.every((row) => selected.has(row.threadId));
  return [
    t("task.bulk.confirmBody"),
    freshConversation && everything ? t("task.bulk.freshNote") : null,
  ].filter(Boolean).join(" ");
}

export function bulkDeleteOutcome(outcome: BulkDeleteResult): string {
  const done = summarizeDelete(outcome.responses);
  return [
    t("task.bulk.result", { count: done.deleted }),
    done.busy > 0 ? t("task.bulk.resultBusy", { count: done.busy }) : null,
    done.missing > 0 ? t("task.bulk.resultMissing", { count: done.missing }) : null,
    outcome.error ? t("task.bulk.resultError", { message: outcome.error }) : null,
  ].filter(Boolean).join(" ");
}
