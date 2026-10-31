import { Gauge, Sparkles } from "lucide-react";

import { t } from "@/lib/i18n";
import { setupJobAnswer } from "@/lib/setup-answer";
import type { Bot } from "@/state/store";
import { ModelPicker } from "../ModelPicker";
import type { useBotSettingsDerived } from "../bot-settings/useBotSettingsDerived";
import type { SimplePageId } from "./page-registry";
import { PlaceAnswer } from "./PlaceControl";
import { SettingsPage } from "./SettingsPage";
import { TryAsking } from "./TryAsking";
import { Card, ColRow, NavRow, RowIcon, rowCls, RowText } from "./rows";

type Derived = ReturnType<typeof useBotSettingsDerived>;

export function DetailsTab({ bot, derived, onOpen, editingInstructions, onEditInstructions }: {
  bot: Bot;
  derived: Derived;
  onOpen: (page: SimplePageId) => void;
  editingInstructions?: boolean;
  onEditInstructions?: (open: boolean) => void;
}) {
  const job = setupJobAnswer(bot);

  return (
    <div data-panel-tabpanel="profile">
      {job && (
        <Card anchor="setup">
          <ColRow data-panel-row="setup-job">
            <RowText title={t("botPanel.page.blurb", { name: bot.name })} hint={<span dir="auto" className="line-clamp-3">{job}</span>} />
          </ColRow>
          <ColRow data-panel-row="setup-place">
            <RowText title={t("computer.simple.whereWorks", { name: bot.name })} hint={<PlaceAnswer bot={bot} />} />
          </ColRow>
        </Card>
      )}

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

      <Card anchor="usage">
        <NavRow data-panel-page="usage" icon={Gauge} title={t("settings.section.usage")} onClick={() => onOpen("usage")} />
      </Card>

      <TryAsking bot={bot} />
    </div>
  );
}
