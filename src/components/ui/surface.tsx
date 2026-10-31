import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  padded = false,
  as: As = "section",
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  as?: "section" | "div" | "article";
}) {
  return (
    <As
      className={cn(
        "rounded-[14px] border-[0.5px] border-ink/[0.06] bg-menu",
        padded && "p-4",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function Spinner({ size = 16, className, label }: { size?: number; className?: string; label?: string }) {
  return (
    <span role={label ? "status" : undefined} aria-label={label} className={cn("inline-flex items-center justify-center text-ink-secondary", className)}>
      <Loader2 size={size} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ size?: number | string; className?: string }>;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center animate-fade-in motion-reduce:animate-none", className)}>
      {Icon && (
        <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-ink/[0.05] text-ink-secondary" aria-hidden="true">
          <Icon size={20} />
        </span>
      )}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-secondary">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "accent" | "success" | "danger"; className?: string }) {
  const toneCls = {
    neutral: "bg-ink/[0.07] text-ink-secondary",
    accent: "bg-accent/15 text-accent-text",
    success: "bg-success/15 text-success",
    danger: "bg-danger/15 text-danger",
  }[tone];
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", toneCls, className)}>{children}</span>;
}
