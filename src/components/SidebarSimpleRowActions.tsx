import { MoreHorizontal } from "lucide-react";
import { t } from "@/lib/i18n";
import type { AppState, Bot } from "@/state/store";
import { BotEngineMark } from "./BotModelBadge";

/** Simple mode's trailing row cluster: [three-dots][provider mark], with the dots' slot fixed so rows align. */
export function SidebarSimpleRowActions({
  bot,
  instances,
  menuOpen,
  onMenu,
}: {
  bot: Bot;
  instances: AppState["instances"];
  menuOpen?: boolean;
  onMenu: (menu: { botId: string; x: number; y: number }) => void;
}) {
  return (
    <span className="ms-auto flex shrink-0 items-center gap-1 self-center">
      <button
        type="button"
        data-bot-actions={bot.id}
        aria-label={t("sidebar.bot.actions", { name: bot.name })}
        title={t("sidebar.bot.actions", { name: bot.name })}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(event) => {
          event.stopPropagation();
          const rect = event.currentTarget.getBoundingClientRect();
          onMenu({ botId: bot.id, x: rect.left, y: rect.bottom });
        }}
        onKeyDown={(event) => event.stopPropagation()}
        className="pointer-events-none flex size-6 shrink-0 items-center justify-center rounded-md text-ink-secondary opacity-0 transition-opacity hover:bg-raised hover:text-ink focus-visible:opacity-100 aria-expanded:pointer-events-auto aria-expanded:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 max-md:pointer-events-auto max-md:opacity-70 touch:pointer-events-auto touch:opacity-70"
      >
        <MoreHorizontal size={15} />
      </button>
      <BotEngineMark bot={bot} instances={instances} />
    </span>
  );
}
