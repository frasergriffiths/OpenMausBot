import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** The one badge shape in the app: the Computer page's Running pill. Colour says what the state means. */
export type StateTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE: Record<StateTone, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  info: "bg-accent/15 text-accent-text",
  neutral: "bg-control text-ink-secondary",
};

export function StatePill({ tone = "neutral", children, className, title }: { tone?: StateTone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", TONE[tone], className)}>
      {children}
    </span>
  );
}
