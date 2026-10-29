import { Globe2, Monitor, Plus, Smartphone } from "lucide-react";

import { t } from "@/lib/i18n";
import { useOwnerOrAdmin } from "@/lib/use-owner-or-admin";
import { useStore, type Bot } from "@/state/store";
import { BotAvatar } from "../Avatar";
import { LinuxLocalControl } from "../LinuxLocalControl";
import { useAndroidUsbDevices } from "../AndroidDevicePanel";
import { screenFramePreview } from "../ScreenFrame";
import { SignedInSites } from "../SignedInSites";
import type { useBotSettingsDerived } from "../bot-settings/useBotSettingsDerived";
import type { SimplePageId } from "./page-registry";
import { PlaceControl } from "./PlaceControl";
import { CloudBackendPicker } from "../CloudBackendPicker";
import { Card, ColRow, LinkRow, NavRow } from "./rows";

type Derived = ReturnType<typeof useBotSettingsDerived>;

/** The Computer tab: the bot's screen, the one place control, and the browser behind it. Signed-in sites live here
 *  inline rather than on a view of their own, and the only sign-out is one plain "log out of browser". */
export function ComputerTab({ bot, derived, onOpen }: { bot: Bot; derived: Derived; onOpen: (page: SimplePageId) => void }) {
  const ownerOrAdmin = useOwnerOrAdmin();
  const { state } = useStore();
  const { browserEnabled } = derived;
  const screenOf = t("computer.screenOf", { name: bot.name });
  const android = useAndroidUsbDevices();
  const profileId = bot.browserProfile ?? "";
  const profile = (state.config?.browserProfiles ?? []).find((candidate) => candidate.id === profileId);
  const temporary = profileId === "guest";
  const ownChrome = profile?.browser === "chrome" && state.config?.browserEngine?.myChrome === true;
  const sharedBy = profileId && !temporary
    ? state.bots.filter((candidate) => candidate.browserProfile === profileId).map((candidate) => candidate.name)
    : [bot.name];

  const screen = [...bot.messages].reverse().find((message) => message.kind === "screen" && (message.hasImage || message.png));
  const screenSrc = screen ? screenFramePreview({ threadId: bot.threadId, messageId: screen.id }, screen.mime).src : null;

  return (
    <div data-panel-tabpanel="computer" className="[&>*:first-child]:mt-0">
      <LinuxLocalControl />
      <button
        type="button"
        data-panel-action="open-computer"
        aria-label={`${t("place.action.watch")}: ${screenOf}`}
        onClick={() => onOpen("computer")}
        className="group relative mt-2.5 flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-composer ring-1 ring-inset ring-ink/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
      >
        {screenSrc ? (
          <img src={screenSrc} alt="" className="absolute inset-0 size-full object-cover" />
        ) : bot.busy ? (
          <>
            <span className="opacity-55"><BotAvatar bot={bot} size={52} animated={false} /></span>
            <span className="max-w-[80%] text-center text-[13px] text-ink-secondary">{t("botPanel.screen.working")}</span>
          </>
        ) : (
          <>
            <span className="opacity-60"><BotAvatar bot={bot} size={44} state="sleeping" animated={false} /></span>
            <span className="max-w-[80%] text-center text-[13px] font-medium text-ink">{t("botPanel.screen.resting")}</span>
          </>
        )}
        <span
          aria-hidden="true"
          className="absolute bottom-2.5 right-2.5 flex h-7 items-center gap-1.5 rounded-full border border-ink/10 bg-panel/80 px-2.5 text-[12px] text-ink opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 touch:opacity-100"
        >
          <Monitor size={13} aria-hidden="true" />
          {t("place.action.watch")}
        </span>
      </button>
      <div className="mt-3 text-center text-[13px] text-ink-tertiary">{screenOf}</div>

      <Card label={t("computer.simple.whereWorks", { name: bot.name })}>
        <div className="p-3">
          <PlaceControl bot={bot} patch={derived.patch} approvalMode={derived.approvalMode} dataAttr="data-panel-where" />
          {bot.computer === "cloud" && (
            <CloudBackendPicker compact value={bot.cloudBackend ?? "box"} onChange={(backend) => derived.patch({ cloudBackend: backend })} />
          )}
        </div>
        <NavRow
          data-panel-page="browser"
          icon={Globe2}
          title={t("botPanel.page.browser")}
          onClick={() => onOpen("browser")}
        />
        {android.devices.length > 0 && (
          <NavRow
            data-panel-page="android"
            icon={Smartphone}
            title={t("botPanel.page.android")}
            value={android.devices.length}
            onClick={() => onOpen("android")}
          />
        )}
      </Card>

      <Card anchor="logins" label={t("settings.sites.title")}>
        {!browserEnabled ? (
          <ColRow><span className="text-[13px] text-ink-secondary">{t("botSettings.simple.loginsOff", { name: bot.name })}</span></ColRow>
        ) : temporary ? (
          <ColRow><span className="text-[13px] text-ink-secondary">{t("settings.profiles.temporaryHint")}</span></ColRow>
        ) : ownChrome ? (
          <ColRow><span className="text-[13px] text-ink-secondary">{t("settings.profiles.myChromeHint")}</span></ColRow>
        ) : (
          // Security: reading and clearing a browser's sign-ins is the owner's or an admin's; the server refuses anyone else.
          ownerOrAdmin !== false && (profileId === "" || profile) && (
            <>
              <ColRow>
                <SignedInSites bare key={`${bot.id}:${profileId}`} target={{ bot: bot.id }} sharedBy={sharedBy} disabled={Boolean(bot.busy)} />
              </ColRow>
              <LinkRow data-panel-action="add-login" icon={Plus} onClick={() => onOpen("browser")}>{t("settings.logins.add")}</LinkRow>
            </>
          )
        )}
      </Card>
    </div>
  );
}
