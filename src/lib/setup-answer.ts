import type { Bot } from "@/state/store";

/** What the person answered the setup card with: the first line of the conversation when it was the setup request,
 *  else the job the bot was given. The profile and the card's own recap read the same answer. */
export function setupJobAnswer(bot: Pick<Bot, "messages" | "title">): string {
  const first = bot.messages?.find((message) => message.role === "user");
  const answer = first?.setupRequest ? first.text?.trim() : "";
  return answer || bot.title.trim();
}
