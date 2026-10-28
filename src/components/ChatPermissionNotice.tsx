import { missingMacCuaPermissions } from "@/lib/mac-cua-permissions";
import { MacCuaPermissionCard } from "./MacLocalControl";

/** A permission gate in the transcript keeps the card's neutral surface; it is not a failed turn. */
export function ChatPermissionNotice({ reason }: { reason: string }) {
  return (
    <div className="flex justify-start">
      <div className="w-fit max-w-[min(var(--chat-bubble-max),var(--chat-bubble-pct))]">
        <MacCuaPermissionCard permissions={missingMacCuaPermissions(reason)} logReason={reason} />
      </div>
    </div>
  );
}
