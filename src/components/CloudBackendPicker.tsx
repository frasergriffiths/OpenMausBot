import type { CloudBackend } from "../../shared/wire";
import { useStore } from "@/state/store";
import { t } from "@/lib/i18n";
import { Segmented } from "./bot-panel/rows";

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
      <div className="mt-2">
        <Segmented
          label={label}
          attr="data-cloud-backend"
          value={value}
          onChange={onChange}
          options={[
            { value: "box", label: t("botAccess.cloud.boat") },
            { value: "vps", label: t("botAccess.cloud.selfHostedVps") },
          ]}
        />
      </div>
    </div>
  );
}
