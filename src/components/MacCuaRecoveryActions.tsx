import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { missingMacCuaPermissions, type MacCuaPermission } from "@/lib/mac-cua-permissions";
import { t } from "@/lib/i18n";
import { useDesktopCapabilities } from "./DesktopCapabilities";

/** The panes to open when the reason does not name a permission: the old card opened both. */
const ALL_PANES: MacCuaPermission[] = ["accessibility", "screen"];

/**
 * One action row for the local-computer permission card and the chat's permission error. Both call sites
 * render this component, so the primary/secondary/quiet order and the retry-on-focus behaviour cannot drift.
 */
export function MacCuaRecoveryActions({ reason }: { reason: string }) {
  const { capabilities, ready } = useDesktopCapabilities();
  const [pending, setPending] = useState(false);
  const [awaitingGrant, setAwaitingGrant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retry = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await window.ogb?.localControl?.retry();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
    }
  };

  const openSettings = async () => {
    setError(null);
    const permissions = missingMacCuaPermissions(reason);
    // Screen Recording needs a relaunch, so it opens last; after the relaunch the card can offer the other pane.
    const panes = permissions.length ? ALL_PANES.filter((pane) => permissions.includes(pane)) : ALL_PANES;
    setAwaitingGrant(true);
    try {
      for (const permission of panes) {
        await window.ogb?.permOpenSettings?.(permission);
      }
    } catch (cause) {
      setAwaitingGrant(false);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const relaunch = async () => {
    setError(null);
    try {
      await window.ogb?.relaunch?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
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

  if (!ready || capabilities.host.platform !== "darwin" ||
      capabilities.localComputer.available !== false ||
      capabilities.localComputer.reasonCode === "remote-server" ||
      typeof window.ogb?.permOpenSettings !== "function") return null;

  return (
    <div data-mac-cua-actions="" className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void openSettings()}
        className="ui-button ui-button-md ui-button-primary"
      >
        {t("computer.mac.permission.openSystemSettings")}
      </button>
      {typeof window.ogb.relaunch === "function" && (
        <button type="button" onClick={() => void relaunch()} className="ui-button ui-button-md">
          {t("computer.mac.permission.relaunch")}
        </button>
      )}
      <button
        type="button"
        onClick={() => void retry()}
        disabled={pending}
        className="ui-button ui-button-md border-transparent bg-transparent text-ink-secondary hover:bg-raised hover:text-ink"
      >
        {pending && <Loader2 size={13} className="animate-spin" />}
        {t("computer.mac.permission.retry")}
      </button>
      {error && <p role="alert" className="w-full text-[12px] leading-relaxed text-danger">{error}</p>}
    </div>
  );
}
