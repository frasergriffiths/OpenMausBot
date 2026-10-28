import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronRight, Circle, Loader2, Shield } from "lucide-react";
import { Card } from "./SettingsPrimitives";
import { useDesktopCapabilities } from "./DesktopCapabilities";
import { macCuaPermissionMessage, missingMacCuaPermissions, type MacCuaPermission } from "@/lib/mac-cua-permissions";
import { t } from "@/lib/i18n";
import { plainErrorLine } from "@/lib/plain-error";

const PANE_ORDER: MacCuaPermission[] = ["screen", "accessibility"];

const PANE_NAME = {
  screen: "computer.mac.permission.screenName",
  accessibility: "computer.mac.permission.accessibilityName",
} as const;

const PANE_SETTINGS = {
  screen: "computer.mac.permission.screenSettings",
  accessibility: "computer.mac.permission.accessibilitySettings",
} as const;

// Explicit controls, not .ui-button: Simple Settings rewrites every .ui-button into an ink pill, and this card
// must look the same in the computer panel, in Settings and in the chat transcript.
const PRIMARY = "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-medium text-accent-ink hover:brightness-110 disabled:opacity-50";
const SECONDARY = "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-control px-3 text-[13px] font-medium text-ink hover:bg-raised-hover disabled:opacity-50";
const TERTIARY = "rounded-md px-1.5 py-1 text-[13px] font-medium text-ink-secondary hover:bg-ink/[0.04] hover:text-ink disabled:opacity-50";

/** The permission card's one look. `MacLocalControl` mounts it in the panel and Settings; ChatView mounts it
 * directly in a failed turn so a setup step is not painted as a crash. */
export function MacCuaPermissionCard({ reason }: { reason: string }) {
  const permissions = missingMacCuaPermissions(reason);
  const permissionsKey = permissions.join(",");
  const known = permissions.length > 0;
  const [pending, setPending] = useState(false);
  const [awaitingGrant, setAwaitingGrant] = useState(false);
  const [stillMissing, setStillMissing] = useState(false);
  const [error, setError] = useState("");
  const opened = useRef(false);
  const lastPermissions = useRef(permissionsKey);
  const relaunchAvailable = typeof window !== "undefined" && typeof window.ogb?.relaunch === "function";

  useEffect(() => {
    if (permissionsKey === lastPermissions.current) return;
    lastPermissions.current = permissionsKey;
    setStillMissing(false);
  }, [permissionsKey]);

  const retry = async () => {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await window.ogb?.localControl?.retry();
      // The card still being here means the capability is still false. If a pane was opened, macOS is waiting for
      // the relaunch that Screen Recording grants need; Relaunch becomes the primary next.
      if (opened.current && known) setStillMissing(true);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(plainErrorLine(message) ?? message);
    } finally {
      setPending(false);
      setAwaitingGrant(false);
    }
  };

  const openSettings = async (pane?: MacCuaPermission) => {
    setError("");
    opened.current = true;
    setStillMissing(false);
    setAwaitingGrant(true);
    try {
      await window.ogb?.permOpenSettings?.(pane ?? "privacy");
    } catch (cause) {
      setAwaitingGrant(false);
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(plainErrorLine(message) ?? message);
    }
  };

  const relaunch = async () => {
    setError("");
    try {
      await window.ogb?.relaunch?.();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(plainErrorLine(message) ?? message);
    }
  };

  // Opening System Settings takes focus away. When the person comes back, check once whether the grant landed.
  useEffect(() => {
    if (!awaitingGrant) return;
    let used = false;
    const onFocus = () => {
      if (used) return;
      if (document.visibilityState !== "visible") return;
      used = true;
      setAwaitingGrant(false);
      void retry();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // retry only reads the current bridge; a new render must not restart the one-shot listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingGrant]);

  const missingPane = permissions[0];
  const primaryIsRelaunch = stillMissing && relaunchAvailable;
  const primaryLabel = pending
    ? t("common.checking")
    : primaryIsRelaunch
      ? t("computer.mac.permission.relaunch")
      : missingPane
        ? t(PANE_SETTINGS[missingPane])
        : t("computer.mac.permission.openSettings");
  const primaryAction = () => {
    if (primaryIsRelaunch) void relaunch();
    else if (missingPane) void openSettings(missingPane);
    else void openSettings();
  };

  return (
    <Card>
      <section data-mac-permission-card="" className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent-text">
          <Shield size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-medium leading-5 text-ink">{t("computer.mac.permission.title")}</h3>
          <p className="mt-1 text-[13px] leading-5 text-ink-secondary">
            {known ? macCuaPermissionMessage(permissions) : t("computer.mac.permission.generic")}
          </p>
          {known && (
            <ul className="mt-3 divide-y divide-hairline/30 rounded-lg border border-hairline/40 px-3">
              {PANE_ORDER.map((pane) => {
                const granted = !permissions.includes(pane);
                const waiting = awaitingGrant && !granted && pane === missingPane;
                return (
                  <li key={pane} className="flex min-h-8 items-center gap-2 text-[13px] text-ink">
                    {granted
                      ? <Check size={14} className="shrink-0 text-success" aria-hidden="true" />
                      : waiting
                        ? <Loader2 size={14} className="shrink-0 animate-spin text-ink-tertiary" aria-hidden="true" />
                        : <Circle size={14} className="shrink-0 text-ink-tertiary" aria-hidden="true" />}
                    <span className="min-w-0 flex-1 truncate">{t(PANE_NAME[pane])}</span>
                    <span className={granted ? "shrink-0 text-[11px] font-medium text-success" : waiting ? "shrink-0 text-[11px] font-medium text-ink-tertiary" : "shrink-0 text-[11px] font-medium text-ink-secondary"}>
                      {granted ? t("computer.mac.permission.granted") : waiting ? t("computer.mac.permission.waiting") : t("computer.mac.permission.notGranted")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {awaitingGrant && <p className="mt-2 text-[12px] leading-4 text-ink-secondary">{t("computer.mac.permission.settingsHint")}</p>}
          {stillMissing && relaunchAvailable && <p className="mt-2 text-[12px] leading-4 text-ink-secondary">{t("computer.mac.permission.relaunchHint")}</p>}
          {error && (
            <p role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] leading-5 text-danger">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{error}</span>
            </p>
          )}
          <div data-mac-cua-actions="" className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={primaryAction} disabled={pending} className={PRIMARY}>
              {pending && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
              {primaryLabel}
            </button>
            {!primaryIsRelaunch && known && relaunchAvailable && (
              <button type="button" onClick={() => void relaunch()} disabled={pending} className={SECONDARY}>
                {t("computer.mac.permission.relaunch")}
              </button>
            )}
            {primaryIsRelaunch && missingPane && (
              <button type="button" onClick={() => void openSettings(missingPane)} disabled={pending} className={SECONDARY}>
                {t(PANE_SETTINGS[missingPane])}
              </button>
            )}
            <button type="button" onClick={() => void retry()} disabled={pending} className={TERTIARY}>
              {t("computer.mac.permission.retry")}
            </button>
          </div>
          {reason && (
            <details className="group mt-3 border-t border-hairline/30 pt-2">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-[12px] leading-4 text-ink-secondary hover:text-ink [&::-webkit-details-marker]:hidden">
                <ChevronRight size={14} className="transition-transform group-open:rotate-90" aria-hidden="true" />
                {t("computer.mac.permission.technicalDetails")}
              </summary>
              <p className="mt-2 max-h-24 overflow-y-auto break-words rounded-lg bg-inset px-3 py-2 text-[12px] leading-5 text-ink-secondary">{reason}</p>
            </details>
          )}
        </div>
      </section>
    </Card>
  );
}

export function MacLocalControl() {
  const { capabilities, ready } = useDesktopCapabilities();
  if (!ready ||
      capabilities.host.platform !== "darwin" ||
      capabilities.localComputer.reasonCode === "remote-server" ||
      capabilities.localComputer.available) return null;
  return <MacCuaPermissionCard reason={capabilities.localComputer.message ?? ""} />;
}
