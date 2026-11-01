import { t } from "@/lib/i18n";
import { GrokBotMark } from "./GrokBotMark";
import { GrokImportFlow } from "./GrokImportFlow";

/** Bring a Grok bot's work across. Standalone: it does not depend on the old Data page or backups. */
export function GrokImportSettings() {
  return (
    <section data-import-section="grok" className="rounded-xl bg-card p-4">
      <div className="flex items-center gap-2 text-[15px] font-medium text-ink"><GrokBotMark size={16} />{t("settings.import.grokTitle")}</div>
      <div className="mt-0.5 text-[13px] leading-relaxed text-ink-secondary">{t("settings.import.grokSubtitle")}</div>
      <div className="mt-4"><GrokImportFlow bare /></div>
    </section>
  );
}
