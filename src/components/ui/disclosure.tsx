import { useId, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";

export function Disclosure({
  title,
  hint,
  open,
  onToggle,
  children,
  trailing,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  const region = useId();
  return (
    <div className={cn("min-w-0", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={region}
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left",
          "transition-colors duration-150 motion-reduce:transition-none hover:bg-ink/[0.04]",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
        )}
      >
        <ChevronRight
          size={14}
          aria-hidden="true"
          className={cn("shrink-0 text-ink-secondary transition-transform duration-200 ease-out motion-reduce:transition-none", open && "rotate-90")}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-ink">{title}</span>
          {hint && <span className="mt-0.5 block text-[12px] text-ink-secondary">{hint}</span>}
        </span>
        {trailing}
      </button>
      <div id={region} hidden={!open} className="pl-[23px] pt-1">
        {children}
      </div>
    </div>
  );
}
