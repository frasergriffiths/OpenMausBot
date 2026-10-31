import { AlertTriangle } from "lucide-react";
import type { ConfigStatus } from "@/state/store";
import { t } from "@/lib/i18n";
import { Callout } from "@/components/ui";

export type LicenseNotice = { tone: "warning" | "danger"; text: string };

export function licenseNotice(config: ConfigStatus | null | undefined): LicenseNotice | null {
  const license = config?.edition?.license;
  if (!license || typeof license.expiresAt !== "string" || !Number.isFinite(license.expiresInDays)) return null;
  if (license.graceEndsAt) {
    return { tone: "danger", text: t("settings.license.grace", { date: license.expiresAt, graceEnd: license.graceEndsAt }) };
  }
  return { tone: "warning", text: t("settings.license.expiring", { date: license.expiresAt, days: String(Math.max(0, license.expiresInDays)) }) };
}

export function LicenseExpiryBanner({ config }: { config: ConfigStatus | null | undefined }) {
  const notice = licenseNotice(config);
  if (!notice) return null;
  return (
    <Callout role="status" tone={notice.tone === "danger" ? "danger" : "warning"} icon={<AlertTriangle size={14} />} className="py-2.5">
      {notice.text}
    </Callout>
  );
}
