import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type NoticeTone = "warning" | "ready" | "error";

const TONE: Record<NoticeTone, string> = {
  warning: "bg-warning/10 text-warning",
  ready: "bg-success/10 text-success",
  error: "bg-danger/10 text-danger",
};

/** One notice for service and connection states: a short sentence, an optional action after it. */
export function Notice({ tone, children, action, className }: {
  tone: NoticeTone;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      data-notice={tone}
      className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl px-4 py-3 text-[13px] leading-[18px]", TONE[tone], className)}
    >
      <span className="min-w-0">{children}</span>
      {action}
    </div>
  );
}
