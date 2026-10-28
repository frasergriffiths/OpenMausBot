import { Plus } from "lucide-react";
import { t } from "@/lib/i18n";

/** The Simple header's new-conversation control. */
export function ChatNewThreadButton({ onNew }: { onNew: () => void }) {
  return (
    <button
      type="button"
      data-chathead-new-thread
      onClick={onNew}
      title={t("botPanel.conversations.new")}
      aria-label={t("botPanel.conversations.new")}
      className="flex size-8 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ink/[0.06] hover:text-ink"
    >
      <Plus size={18} />
    </button>
  );
}
