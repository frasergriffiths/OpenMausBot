/** What a key save did, for the row's own status line. */
export type KeyResult = "ok" | "rejected" | "unverified";

const CHECKED_BEFORE_SAVE = new Set<string>(["boat", "composio", "elevenlabs", "fish_audio"]);

/** The server saves these keys only after their provider accepted them; every other key is unverified until tested. */
export function savedKeyResult(provider: string): KeyResult {
  return CHECKED_BEFORE_SAVE.has(provider) ? "ok" : "unverified";
}

const IPC_KEY_REJECTED = /^Error invoking remote method '[^']*': KeyRejected: /;

export function keySaveFailure(cause: unknown): "rejected" | "error" {
  if ((cause as { body?: { code?: unknown } } | null | undefined)?.body?.code === "key_rejected") return "rejected";
  return cause instanceof Error && IPC_KEY_REJECTED.test(cause.message) ? "rejected" : "error";
}

export function keyTestResult(answer: { ok?: unknown; reason?: unknown } | null | undefined): KeyResult {
  if (answer?.ok === true) return "ok";
  return answer?.reason === "rejected" ? "rejected" : "unverified";
}
