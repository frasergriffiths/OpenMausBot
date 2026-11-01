// The Cloud plan surfaces are gone; what remains is the usage summary card and the
// bridge helpers that still read a plan snapshot where the desktop exposes one.
import type { ReactNode } from "react";
import { SIMPLE_CARD } from "@/components/ui";
import type { CloudPlanBridge, CloudPlanSnapshot } from "../../electron/cloud-account.mjs";
import type { CloudUsage } from "../../electron/cloud-home.mjs";
import { useCloudPlanSnapshot } from "./CloudTrialNotice";
import { localDesktopPage } from "./onboarding/WelcomeGate";
import { cn } from "@/lib/cn";
import { meterBand, type MeterBand } from "@/lib/usage-meter";
import { useStore } from "@/state/store";

export function usageBridge(cloudHome: boolean): CloudPlanBridge | undefined {
  if (window.ogb?.remoteClient?.active === true) return undefined;
  return localDesktopPage() ? (window.ogb?.cloudAccount ? window.ogb?.cloudPlan : undefined) : cloudHome ? window.ogb?.cloudPlan : undefined;
}

export function useCloudUsage(): { usage: CloudUsage | null; bridge: CloudPlanBridge | undefined; teamHome: boolean } {
  const { state } = useStore();
  const bridge = usageBridge(state.config?.cloudHome === true);
  const plan: CloudPlanSnapshot | null = useCloudPlanSnapshot(bridge);
  return { usage: plan?.status === "paid" ? plan.usage ?? null : null, bridge, teamHome: Boolean(state.config?.cloudHome && state.config?.team) };
}

export function UsageSummaryCard({ kind, title, percent, label, note, children }: {
  kind: "cloud" | "plan";
  title: string;
  percent: number;
  label: string;
  note: ReactNode;
  children?: ReactNode;
}) {
  const band: MeterBand = meterBand(percent);
  return (
    <section data-usage-summary={kind} data-band={band} aria-label={label} className={cn(SIMPLE_CARD, "px-4 py-3.5")}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink">{title}</span>
        <span className={cn("shrink-0 text-[12px] tabular-nums", band === "full" ? "text-danger" : band === "near" ? "text-warning" : "text-ink-secondary")}>{label}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-inset">
        <div className={cn("h-full rounded-full", band === "full" ? "bg-danger" : band === "near" ? "bg-warning" : "bg-accent")} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
      <div className="mt-1.5 text-[12px] text-ink-secondary">{note}</div>
      {children}
    </section>
  );
}
