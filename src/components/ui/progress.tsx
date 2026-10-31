import { cn } from "@/lib/cn";

export function Progress({ value, max = 1, label, className }: { value: number; max?: number; label: string; className?: string }) {
  const safe = Math.max(0, Math.min(value, max));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={safe}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-ink/10", className)}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out motion-reduce:transition-none"
        style={{ width: String((safe / max) * 100) + "%" }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block animate-shimmer rounded-md bg-ink/[0.07]", className)} />;
}
