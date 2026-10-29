// Duty-cycled: a spinner repaints every vsync, so these dots hold opacity steps and the timer writes its own text node
// once a second instead of committing through React.
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { useVisibleInterval } from "@/hooks/use-visible-interval";
import { formatElapsed } from "@/lib/working-time";

export function WorkingDots({ size = 4, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("flex items-center gap-1", className)} aria-hidden="true">
      {[0, 200, 400].map((delay) => (
        <span
          key={delay}
          className="animate-status-pulse rounded-full bg-current"
          style={{ width: size, height: size, animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

export function WorkingTimer({ since, className, format = formatElapsed }: { since: number; className?: string; format?: (elapsedMs: number) => string }) {
  const node = useRef<HTMLSpanElement>(null);
  useVisibleInterval(() => {
    if (node.current) node.current.textContent = format(Date.now() - since);
  }, 1000);
  return <span ref={node} className={cn("tabular-nums", className)} />;
}
