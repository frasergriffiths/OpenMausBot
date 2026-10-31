import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type CalloutTone = "warning" | "danger" | "success" | "info";

const TONE: Record<CalloutTone, string> = {
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  success: "bg-success/10 text-success",
  info: "bg-ink/[0.06] text-ink-secondary",
};

/** A tinted note with no border: the one shape for warnings, errors and asides. */
export function Callout({
  tone = "warning",
  icon,
  children,
  className,
  role,
}: {
  tone?: CalloutTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  return (
    <div role={role} className={cn("flex items-start gap-2 rounded-xl px-3 py-2 text-[13px] leading-relaxed", TONE[tone], className)}>
      {icon ? <span className="mt-0.5 shrink-0" aria-hidden="true">{icon}</span> : null}
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

