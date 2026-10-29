export type SelectableRow = {
  threadId: string;
  busy?: boolean;
  activity?: string;
};

export type DeleteRefusal = { threadId: string; reason: "not-found" | "busy" };
export type DeleteResponse = { deleted: string[]; refused: DeleteRefusal[] };

export const BULK_DELETE_CHUNK = 200;

/** The server refuses a running thread, so it cannot be swept into a delete. */
export const isTickable = (row: Pick<SelectableRow, "busy" | "activity">): boolean =>
  row.activity !== "working" && !row.busy;

export function chunkIds(ids: readonly string[], size = BULK_DELETE_CHUNK): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size));
  return chunks;
}

export function summarizeDelete(responses: readonly DeleteResponse[]): { deleted: number; busy: number; missing: number } {
  const summary = { deleted: 0, busy: 0, missing: 0 };
  for (const response of responses) {
    summary.deleted += response.deleted.length;
    for (const refusal of response.refused) {
      if (refusal.reason === "busy") summary.busy++; else summary.missing++;
    }
  }
  return summary;
}

export const opensRowMenuFromKey = (key: string, shiftKey: boolean): boolean =>
  key === "ContextMenu" || (shiftKey && key === "F10");
