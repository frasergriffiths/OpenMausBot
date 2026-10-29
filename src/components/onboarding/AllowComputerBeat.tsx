import { useEffect } from "react";

import { missingMacCuaPermissions } from "@/lib/mac-cua-permissions";
import { t } from "@/lib/i18n";
import { useDesktopCapabilities } from "../DesktopCapabilities";
import { MacCuaPermissionCard } from "../MacLocalControl";

/** The first run's ask for the Mac's two grants: the same card Settings draws, with a way to check again and to skip.
 *  It moves on by itself once the local computer can be driven. */
export function AllowComputerBeat({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { capabilities, ready } = useDesktopCapabilities();
  const available = ready && capabilities.localComputer.available;
  const message = capabilities.localComputer.message ?? "";
  useEffect(() => {
    if (available) onNext();
  }, [available, onNext]);
  if (available) return null;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-6 py-10">
      <h1 id="welcome-title" className="sr-only">{t("computer.mac.permission.title")}</h1>
      <MacCuaPermissionCard permissions={missingMacCuaPermissions(message)} logReason={message} showCheckAgain onSkip={onSkip} />
    </div>
  );
}
