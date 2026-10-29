import type { Bot } from "@/state/store";
import { t } from "@/lib/i18n";
import { BotAvatar } from "./Avatar";

/** A chat with no messages yet: the bot, its name and what it is for. */
export function EmptyChat({ bot }: { bot: Bot }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
      <BotAvatar bot={bot} state="idle" size={64} motion="none" motionKey={0} />
      <div className="text-[17px] font-semibold text-ink">{bot.name}</div>
      <div className="max-w-[360px] text-[14px] text-ink-secondary">
        {bot.description || t("chat.emptyPrompt")}
      </div>
    </div>
  );
}
