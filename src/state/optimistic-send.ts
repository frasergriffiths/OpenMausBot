// A send shows at once as an optimistic user message; the server's copy, which carries the same sendId, replaces it.
import type { Message } from "./store";

export const optimisticMessageId = (sendId: string): string => `optimistic-${sendId}`;

/** An id the server has never seen: a page cursor built from one would 404 and the scrollback would stop. */
export const isOptimisticMessageId = (id: string): boolean => id.startsWith("optimistic-");

export function optimisticUserMessage(
  text: string,
  sendId: string,
  replyToId?: string,
  parentId?: string | null,
  channelMode?: "chat" | "goal",
): Message {
  return {
    id: optimisticMessageId(sendId),
    role: "user",
    kind: "text",
    text,
    at: Date.now(),
    parentId: parentId ?? null,
    replyToId,
    sendId,
    channelMode,
  };
}
