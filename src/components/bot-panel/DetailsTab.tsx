import { Calendar, Gauge, ListChecks, Sparkles } from "lucide-react";

import { t } from "@/lib/i18n";
import type { Bot } from "@/state/store";
import { ModelPicker } from "../ModelPicker";
import type { useBotSettingsDerived } from "../bot-settings/useBotSettingsDerived";
import type { SimplePageId } from "./page-registry";
import { SettingsPage } from "./SettingsPage";
import { TryAsking } from "./TryAsking";
import { Card, NavRow, RowIcon, rowCls, RowText } from "./rows";

type Derived = ReturnType<typeof useBotSettingsDerived>;

export function DetailsTab({ bot, derived, onOpen, editingInstructions, onEditInstructions }: {
  bot: Bot;
  derived: Derived;
  onOpen: (page: SimplePageId) => void;
  editingInstructions?: boolean;
  onEditInstructions?: (open: boolean) => void;
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

      <SettingsPage bot={bot} derived={derived} onOpen={onOpen} editingInstructions={editingInstructions} onEditInstructions={onEditInstructions} embedded />

      {derived.botRoutines.length > 0 && (
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

      <Card anchor="usage">
        <NavRow data-panel-page="usage" icon={Gauge} title={t("settings.section.usage")} onClick={() => onOpen("usage")} />
        <NavRow data-panel-page="activity" icon={ListChecks} title={t("activity.panel.title")} onClick={() => onOpen("activity")} />
      </Card>

      <TryAsking bot={bot} />
    </div>
  );
}
