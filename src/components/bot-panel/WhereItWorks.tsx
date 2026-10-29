import { Globe2, Monitor, Smartphone } from "lucide-react";

import { writeComputerPanelView, type ComputerPanelView } from "@/lib/computer-panel-view";
import { t } from "@/lib/i18n";
import { useAdvancedMode } from "@/lib/interface-mode";
import { useStore, type Bot } from "@/state/store";
import { BotAvatar } from "../Avatar";
import { LinuxLocalControl } from "../LinuxLocalControl";
import { useAndroidUsbDevices } from "../AndroidDevicePanel";
import { screenFramePreview } from "../ScreenFrame";
import type { useBotSettingsDerived } from "../bot-settings/useBotSettingsDerived";
import type { SimplePageId } from "./page-registry";
import { PlaceControl } from "./PlaceControl";
import { CloudBackendPicker } from "../CloudBackendPicker";
import { Card, NavRow } from "./rows";

type Derived = ReturnType<typeof useBotSettingsDerived>;

export function useOpenComputer(bot: Pick<Bot, "id">) {
  const { dispatch } = useStore();
  return (view: ComputerPanelView = "computer") => {
    writeComputerPanelView(bot.id, view);
    dispatch({ type: "toggleSettings", open: false });
    dispatch({ type: "toggleComputer", open: true });
  };
}

/** Where the bot works, as part of its profile: its screen, the place control every surface shares, and the browser and
 *  signed-in sites behind it. There is no separate Computer tab and no second control. */
export function WhereItWorks({ bot, derived, onOpen }: { bot: Bot; derived: Derived; onOpen: (page: SimplePageId) => void }) {
  const screenOf = t("computer.screenOf", { name: bot.name });
  const android = useAndroidUsbDevices();
  const openComputer = useOpenComputer(bot);
  const advanced = useAdvancedMode();

  const screen = [...bot.messages].reverse().find((message) => message.kind === "screen" && (message.hasImage || message.png));
  const screenSrc = screen ? screenFramePreview({ threadId: bot.threadId, messageId: screen.id }, screen.mime).src : null;

  return (
    <div data-panel-where-section="">
      <LinuxLocalControl />
      <button
        type="button"
        data-panel-action="open-computer"
        aria-label={`${t("place.action.watch")}: ${screenOf}`}
        onClick={() => (advanced ? openComputer("computer") : onOpen("computer"))}
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

      <Card label={t("computer.simple.whereWorks", { name: bot.name })} anchor="where">
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
    </div>
  );
}
