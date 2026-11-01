import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { AppSettingsSection } from "@/state/store";
import type { LocaleKey } from "@/locales";
import { t } from "@/lib/i18n";
import { appVersion } from "@/lib/app-links";
import { Button, SettingRow, SettingsDisclosureRow, SettingsGroup, SettingsRows } from "@/components/ui";
import { brand } from "../lib/brand";
import { AnalyticsRow } from "./AnalyticsRow";
import { UpdatesConsentRow } from "./UpdatesConsent";
import { OpenAtLoginRow } from "./OpenAtLoginRow";
import { DefaultBotSidebarRow } from "./DefaultBotControls";
import { DiagnosticsRow } from "./DiagnosticsRow";
import { DecisionModelSettings } from "./DecisionModelSettings";
import { EnginesSettings } from "./EnginesSettings";
import { LocalComputerSection } from "./LocalComputerSection";
import { ActivitySection } from "./ActivitySection";
import { BuiltInBrowserRow } from "./BrowserSettingsRows";
import { LoginsSettings } from "./LoginsSettings";
import { SkinPicker } from "./SkinPicker";
import { ChatWidthRow, FontRow, SidebarToolsLayoutRow } from "./AppearanceSelectRows";
import { ProfileSummaryRow } from "./ProfileSettings";
import { DepartmentsSettings } from "./DepartmentsSettings";
import { ImportSettings } from "./ImportSettings";
import { NotificationRows } from "./NotificationSettingsRows";
import { useServerUpdateItem } from "./SidebarProfileMenu";
import { BrowserProfilesRow, BusySendRow, ColorUserBubblesRow, ExperimentalFeaturesRow, LanguageRow, NewBotEffortRow, PinnedCirclesRow, ReplayTourRow, SendKeyRow, UniversalPinsRow, UpdatesRow } from "./AppSettingsRows";
import { SkillsSection } from "./SkillsSection";
import { WorkspacesSection } from "./WorkspacesSection";
import { WorkspaceBackupSettings } from "./WorkspaceBackupSettings";
import { CompanyBackupSettings } from "./CompanyBackupSettings";
import { DefaultBotSettings } from "./NewBotDialog";
import { RoomTurnTimeoutSettings } from "./RoomTurnTimeoutSettings";
import { McpCallTimeoutSettings } from "./McpCallTimeoutSettings";
import { AutomaticRecoverySettings } from "./AutomaticRecoverySettings";
import { CacheKeepWarmSettings } from "./CacheKeepWarmSettings";
import { ThemeRow } from "./ThemeRow";

export type SimpleDisclosureId = "ai-more" | "computer-elsewhere" | "billing-limits" | "general-sidebar" | "general-backups";

export type SimpleSettingsPage = {
  id: string;
  labelKey: LocaleKey;
  descriptionKey?: LocaleKey;
  icon: LucideIcon;
  sections: AppSettingsSection[];
  keywords?: string[];
};

export type Disclose = (id: SimpleDisclosureId) => { id: SimpleDisclosureId; open: boolean; onToggle: () => void };

type Has = (id: AppSettingsSection) => boolean;

export function SimpleAccountPage({ has }: { has: Has }) {
  return (
    <>
      {has("general") && (
        <SettingsGroup block="general">
          <SettingsRows>
            <ProfileSummaryRow />
          </SettingsRows>
        </SettingsGroup>
      )}
      {has("general") && (
        <SettingsGroup label={t("settings.departments.title")} block="departments">
          <DepartmentsSettings />
        </SettingsGroup>
      )}
      {has("general") && (
        <SettingsGroup label={t("settings.simple.group.system")}>
          <SettingsRows>
            <OpenAtLoginRow simple />
            <BusySendRow simple />
            <DefaultBotSidebarRow simple />
            <AnalyticsRow simple />
          </SettingsRows>
        </SettingsGroup>
      )}
      {has("general") && (
        <SettingsGroup label={t("settings.simple.group.limits")} block="limits">
          <div className="rounded-[var(--radius-card)] border-[0.5px] border-(--settings-edge) bg-menu p-4"><RoomTurnTimeoutSettings /></div>
          <AutomaticRecoverySettings />
        </SettingsGroup>
      )}
    </>
  );
}

export function SimpleAppearancePage({ has, onLooks, disclose }: { has: Has; onLooks: () => void; disclose: Disclose }) {
  return (
    <>
      {has("appearance") && (
        <SettingsGroup block="appearance">
          <SettingsRows>
            <ThemeRow simple />
            <ColorUserBubblesRow simple />
            <FontRow />
            <ChatWidthRow />
            <LanguageRow simple />
            <SendKeyRow simple />
            <SettingRow title={t("settings.simple.looks.title")}>
              <Button size="sm" type="button" onClick={onLooks}>{t("settings.simple.looks.change")}</Button>
            </SettingRow>
          </SettingsRows>
        </SettingsGroup>
      )}
      {has("appearance") && (
        <SettingsDisclosureRow title={t("settings.simple.group.sidebar")} subtitle={t("settings.simple.sidebar.subtitle")} block="sidebar" {...disclose("general-sidebar")}>
          <SettingsRows>
            <SidebarToolsLayoutRow />
            <PinnedCirclesRow />
            <UniversalPinsRow />
          </SettingsRows>
        </SettingsDisclosureRow>
      )}
      {has("appearance") && (
        <SettingsGroup label={t("notifications.title")}>
          <SettingsRows><NotificationRows simple /></SettingsRows>
        </SettingsGroup>
      )}
    </>
  );
}

export function SimpleDataPage({ has, disclose }: { has: Has; disclose: Disclose }) {
  return (
    <>
      <SettingsDisclosureRow title={t("settings.section.backups")} subtitle={t("settings.simple.backups.subtitle")} block="backups" {...disclose("general-backups")}>
        <div className="flex flex-col gap-4"><WorkspaceBackupSettings /><CompanyBackupSettings /></div>
      </SettingsDisclosureRow>
      {has("import") && <SettingsGroup label={t("settings.section.import")} block="import"><ImportSettings /></SettingsGroup>}
      {has("activity") && <SettingsGroup label={t("settings.section.activity")} block="activity"><ActivitySection /></SettingsGroup>}
    </>
  );
}

export function SimpleLooksPage({ onBack }: { onBack: () => void }) {
  return (
    <>
      <div><Button size="sm" type="button" onClick={onBack}>{t("settings.simple.looks.back")}</Button></div>
      <div data-settings-block="looks"><SkinPicker /></div>
    </>
  );
}

export function SimpleAiPage({ has, disclose }: { has: Has; disclose: Disclose }) {
  return (
    <>
      {has("engines") && <div data-settings-block="engines" className="flex scroll-mt-4 flex-col gap-7"><EnginesSettings simple more={disclose("ai-more")} /></div>}
      {has("engines") && (
        <SettingsGroup label={t("settings.simple.group.newBots")} block="new-bots">
          <SettingsRows>
            <NewBotEffortRow />
            <DefaultBotSettings />
          </SettingsRows>
        </SettingsGroup>
      )}
      {has("engines") && (
        <SettingsGroup label={t("settings.simple.group.performance")} block="performance">
          <CacheKeepWarmSettings />
        </SettingsGroup>
      )}
      {has("decisionModel") && <div data-settings-block="decisionModel" className="scroll-mt-4"><DecisionModelSettings /></div>}
      <SettingsGroup label={t("settings.simple.group.tools")} block="mcp-calls">
        <CardBlock>
          <McpCallTimeoutSettings />
        </CardBlock>
      </SettingsGroup>
    </>
  );
}

export function SimpleSkillsPage({ has }: { has: Has }) {
  return (
    <>
      {has("skills") && <div data-settings-block="skills" className="scroll-mt-4"><SkillsSection /></div>}
      {has("experimental") && <div data-settings-block="experimental" className="scroll-mt-4"><ExperimentalFeaturesRow /></div>}
    </>
  );
}

function CardBlock({ children }: { children: ReactNode }) {
  return <div className="rounded-[var(--radius-card)] border-[0.5px] border-(--settings-edge) bg-menu p-4">{children}</div>;
}

export function SimpleKeysPage({ has, connections, sms }: { has: Has; connections: ReactNode; sms?: ReactNode }) {
  if (!has("connections") && !has("sms")) return null;
  return (
    <>
      {has("connections") && <div data-settings-block="connections" className="scroll-mt-4">{connections}</div>}
      {has("sms") && <SettingsGroup label={t("settings.sms.group")} block="sms">{sms}</SettingsGroup>}
    </>
  );
}

export function SimpleComputerPage({ has, servers, installs, disclose }: { has: Has; servers: ReactNode; installs?: ReactNode; disclose: Disclose }) {
  return (
    <>
      {has("computer") && <SettingsGroup label={t("settings.simple.computer.bots")} block="computer"><LocalComputerSection /></SettingsGroup>}
      {has("computer") && (
        <SettingsGroup label={t("settings.experimental.browser")} block="browser">
          <SettingsRows><BuiltInBrowserRow /></SettingsRows>
          <BrowserProfilesRow />
        </SettingsGroup>
      )}
      {has("logins") && <div data-settings-block="logins" className="scroll-mt-4"><LoginsSettings /></div>}
      {(has("desktopWorkspaces") || installs) && (
        <SettingsDisclosureRow title={t("settings.simple.computer.elsewhere")} block="elsewhere" {...disclose("computer-elsewhere")}>
          {has("desktopWorkspaces") && <div data-settings-block="desktopWorkspaces" className="flex scroll-mt-4 flex-col gap-4">{servers}</div>}
          {installs && <div data-settings-block="workspaces" className="scroll-mt-4">{installs}</div>}
        </SettingsDisclosureRow>
      )}
    </>
  );
}

const versionTitle = () => `${brand().name} ${appVersion()}`;

function ServerUpdatesRow() {
  const entry = useServerUpdateItem(true);
  if (!entry) return null;
  const status = entry.phase === "idle" ? undefined : [entry.label, entry.item.subtitle].filter(Boolean).join(" ");
  const action = entry.phase === "available" ? t("settings.simple.updates.seeRelease")
    : entry.phase === "reload" ? t("settings.simple.updates.reload")
      : entry.phase === "checking" ? t("common.checking") : t("settings.updates.check");
  return (
    <SettingRow title={versionTitle()} subtitle={status}>
      <Button size="sm" type="button" disabled={entry.item.disabled} onClick={entry.item.onSelect}>{action}</Button>
    </SettingRow>
  );
}

export function SimpleUpdatesPage({ remoteActive }: { remoteActive: boolean }) {
  return (
    <SettingsGroup block="updates">
      <SettingsRows>
        {window.ogb?.updater ? <UpdatesRow title={versionTitle()} /> : <ServerUpdatesRow />}
        <UpdatesConsentRow />
        {!remoteActive && <ReplayTourRow />}
        <DiagnosticsRow simple />
      </SettingsRows>
    </SettingsGroup>
  );
}

export function SimpleInstallationsSection() {
  return <WorkspacesSection />;
}
