import { useEffect, useRef } from "react";

import { useStore, type Bot } from "@/state/store";
import { useCaptionChrome } from "./DesktopCapabilities";
import { useBotSettingsDerived } from "./bot-settings/useBotSettingsDerived";
import { BotPanel } from "./bot-panel/PanelShell";
import { BOT_PANEL_ID, sidePanelCls } from "./bot-panel/side-panel";
import { SidePanelResizeHandle, useSidePanelWidth } from "./bot-panel/side-panel-size";

export function BotSettingsDialog({ bot, overlay = false, onOpenVmWorkspace }: {
  bot: Bot;
  overlay?: boolean;
  onOpenVmWorkspace?: (botId: string) => void;
}) {
  const { state, dispatch } = useStore();
  const section = state.botSettingsSection;
  const derived = useBotSettingsDerived(bot);
  const dialogRef = useRef<HTMLElement | null>(null);
  const { padClass, dragProps } = useCaptionChrome();
  const collapsed = !state.botSettingsExpandAccordion;
  const sizing = useSidePanelWidth({ simple: true, active: !overlay });
  // Any open that names or remembers a section lands on it; a bare uncollapsed open still starts at Profile.
  const linkedSection = collapsed ? null : section;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.focus();

    const onKey = (event: KeyboardEvent) => {
      const nested = dialog?.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]');
      if (nested && nested.getClientRects().length > 0) return;
      // BotInstructionsDialog portals to document.body: a key pressed with focus outside this dialog is not ours.
      if (dialog && event.target instanceof Node && !dialog.contains(event.target)) return;
      // A popover or field inside that already handled this Escape keeps the panel open.
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        dispatch({ type: "toggleSettings", open: false });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [dispatch]);

  return (
    <>
      {overlay && (
        <div
          data-bot-panel-scrim=""
          aria-hidden="true"
          onClick={() => dispatch({ type: "toggleSettings", open: false })}
          className="fixed inset-0 z-30 bg-black/25"
        />
      )}
      <aside
        ref={dialogRef}
        id={BOT_PANEL_ID}
        role="dialog"
        aria-labelledby="bot-settings-title"
        tabIndex={-1}
        style={overlay ? undefined : ({ "--side-panel-width": `${sizing.width}px` } as React.CSSProperties)}
        className={sidePanelCls(overlay, true)}
      >
        {!overlay && <SidePanelResizeHandle sizing={sizing} />}
        <BotPanel
          bot={bot}
          derived={derived}
          headerClassName={padClass}
          headerProps={dragProps}
          linkedSection={linkedSection}
          onClose={() => dispatch({ type: "toggleSettings", open: false })}
          onOpenVmWorkspace={onOpenVmWorkspace}
        />
      </aside>
    </>
  );
}
