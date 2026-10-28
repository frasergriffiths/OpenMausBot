import { ChevronRight, Shield } from "lucide-react";
import { useDesktopCapabilities } from "./DesktopCapabilities";
import { macCuaPermissionMessage, missingMacCuaPermissions } from "@/lib/mac-cua-permissions";
import { MacCuaRecoveryActions } from "./MacCuaRecoveryActions";
import { t } from "@/lib/i18n";

export function MacLocalControl() {
  const { capabilities } = useDesktopCapabilities();
  const reason = capabilities.localComputer.available ? null : capabilities.localComputer.message;
  const permissionMessage = macCuaPermissionMessage(missingMacCuaPermissions(reason));

  if (capabilities.host.platform !== "darwin" || capabilities.localComputer.reasonCode === "remote-server") return null;
  if (capabilities.localComputer.available) return null;

  return (
    <section data-mac-permission-card="" className="mt-4 rounded-xl border border-hairline/40 bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning/10">
          <Shield size={16} className="text-warning" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-medium leading-5 text-warning">{t("computer.mac.permission.allowControl")}</h3>
          <p className="mt-1 text-[13px] leading-[18px] text-ink-secondary">
            {permissionMessage ?? t("computer.mac.permission.generic")}
          </p>
          {reason && (
            <details className="group mt-2.5">
              <summary className="flex w-full cursor-pointer list-none items-center gap-1.5 text-[12px] leading-4 text-ink-secondary hover:text-ink [&::-webkit-details-marker]:hidden">
                <ChevronRight size={13} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none" />
                {t("computer.mac.permission.driverDetail")}
              </summary>
              <p className="mt-1.5 break-words border-l border-hairline/60 pl-3 text-[12px] leading-relaxed text-ink-secondary">{reason}</p>
            </details>
          )}
          <MacCuaRecoveryActions reason={reason ?? ""} />
        </div>
      </div>
    </section>
  );
}
