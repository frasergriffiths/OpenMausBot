import { Calendar, Sparkles } from "lucide-react";

import { t } from "@/lib/i18n";
import type { Bot } from "@/state/store";
import { ModelPicker } from "../ModelPicker";
import type { useBotSettingsDerived } from "../bot-settings/useBotSettingsDerived";
import type { SimplePageId } from "./page-registry";
import { TryAsking } from "./TryAsking";
import { Card, NavRow, RowIcon, rowCls, RowText } from "./rows";

type Derived = ReturnType<typeof useBotSettingsDerived>;

export function DetailsTab({ bot, derived, onOpen }: {
  bot: Bot;
  derived: Derived;
  onOpen: (page: SimplePageId) => void;
}) {
  const routinesOn = derived.botRoutines.filter((routine) => routine.enabled).length;

  return (
    <div data-panel-tabpanel="details">
      <Card anchor="model">
        <div data-panel-row="model" className={rowCls}>
          <ModelPicker
            bot={bot}
            contained
            threadId={bot.threadId}
            label={<span className="flex min-w-0 flex-1 items-center gap-2.5"><RowIcon icon={Sparkles} /><RowText title={t("model.simple.model")} /></span>}
          />
        </div>
      </Card>

      {derived.botRoutines.length === 0 ? (
        <Card anchor="routines">
          <div data-panel-empty="routines" className="px-4 py-6 text-center text-[13px] leading-[18px] text-ink-tertiary">
            <p>{t("botPanel.routines.empty")}</p>
            <button
              type="button"
              data-panel-page="routines"
              onClick={() => onOpen("routines")}
              className="mt-2 rounded-md px-1.5 py-0.5 text-[13px] font-medium text-ink-secondary hover:bg-ink/[0.04] hover:text-ink"
            >
              {t("botPanel.routines.add")}
            </button>
          </div>
        </Card>
      ) : (
        <Card label={t("botSettings.simple.routines")} anchor="routines">
          <NavRow
            data-panel-page="routines"
            icon={Calendar}
            title={t("botSettings.simple.routines")}
            value={routinesOn > 0 ? t("botPanel.routinesOn", { count: routinesOn }) : t("botPanel.none")}
            onClick={() => onOpen("routines")}
          />
        </Card>
      )}

      <TryAsking bot={bot} />
    </div>
  );
}
