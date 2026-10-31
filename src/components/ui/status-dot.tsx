import { Check, Circle, X } from "lucide-react";

import { cn } from "@/lib/cn";

export type StatusState = "running" | "done" | "failed" | "unknown";

export function StatusDot({ state, label, className }: { state: StatusState; label: string; className?: string }) {
  return (
    <span role="img" aria-label={label} className={cn("flex size-3.5 shrink-0 items-center justify-center", className)}>
      {state === "running" && (
        <span className="relative flex size-2 items-center justify-center">
          <span className="absolute size-2 animate-ping rounded-full bg-accent/50 motion-reduce:animate-none" aria-hidden="true" />
          <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
        </span>
      )}
      {state === "done" && <Check size={12} strokeWidth={2.5} aria-hidden="true" className="text-ink-tertiary" />}
      {state === "failed" && <X size={12} strokeWidth={2.5} aria-hidden="true" className="text-danger" />}
      {state === "unknown" && <Circle size={9} strokeWidth={2} aria-hidden="true" className="text-ink-tertiary" />}
    </span>
  );
}
