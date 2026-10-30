import type { CloudBackend } from "../../shared/wire";
import { cn } from "@/lib/cn";
import { useStore } from "@/state/store";
import { t } from "@/lib/i18n";
import { moveBetweenPillTabs, PILL_TAB, PILL_TAB_OFF, PILL_TAB_ON, PILL_TABS } from "./pill-tabs";

export function CloudBackendPicker({
  value,
  compact = false,
  onChange,
}: {
  value: CloudBackend;
  compact?: boolean;
  onChange: (backend: CloudBackend) => void;
}) {
  const { state } = useStore();
  if (state.config?.cloudHome) return null;
  const label = compact ? t("botAccess.cloud.provider") : t("botAccess.cloud.backend");
  return (
    <div className="mt-3 rounded-lg bg-inset p-3">
      <div className="text-[12px] font-medium text-ink">{label}</div>
      <div className="mt-0.5 text-[12px] text-ink-secondary">
        {compact
          ? value === "vps" ? t("botAccess.cloud.vpsDescription") : t("botAccess.cloud.hostedDescription")
          : value === "vps"
          ? t("botAccess.cloud.vpsAutoDescription")
          : t("botAccess.cloud.hostedBackendDescription")}
      </div>
      <div role="tablist" aria-label={label} className={cn(PILL_TABS, "mt-2")} onKeyDown={(event) => moveBetweenPillTabs(event, (tab) => tab.click())}>
        {(["box", "vps"] as const).map((backend) => (
          <button
            key={backend}
            type="button"
            role="tab"
            aria-selected={value === backend}
            tabIndex={value === backend ? 0 : -1}
            onClick={() => onChange(backend)}
            className={cn(PILL_TAB, "flex-1", value === backend ? PILL_TAB_ON : PILL_TAB_OFF)}
          >
            {backend === "vps" ? t("botAccess.cloud.selfHostedVps") : t("botAccess.cloud.boat")}
          </button>
        ))}
      </div>
    </div>
  );
}
