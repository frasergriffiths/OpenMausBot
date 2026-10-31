import { useRef, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: ReactNode;
  icon?: LucideIcon;
  badge?: ReactNode;
  disabled?: boolean;
}

export function Tabs({
  items,
  active,
  onChange,
  ariaLabel,
  className,
  size = "md",
  orientation = "horizontal",
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
  size?: "sm" | "md";
  orientation?: "horizontal" | "vertical";
}) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const move = (event: React.KeyboardEvent, index: number) => {
    const forward = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
    const back = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
    const step = event.key === forward ? 1 : event.key === back ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const enabled = items.filter((item) => !item.disabled);
    const current = enabled.findIndex((item) => item.id === items[index].id);
    const next = enabled[(current + step + enabled.length) % enabled.length];
    if (next) {
      onChange(next.id);
      refs.current.get(next.id)?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      className={cn("flex gap-0.5 rounded-[10px] bg-ink/[0.045] p-0.5", orientation === "vertical" ? "flex-col items-stretch" : "items-center", className)}
    >
      {items.map((item, index) => {
        const on = item.id === active;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            ref={(node) => {
              if (node) refs.current.set(item.id, node);
              else refs.current.delete(item.id);
            }}
            type="button"
            role="tab"
            data-tab={item.id}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "relative flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg font-medium",
              "transition-[background-color,color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
              "disabled:cursor-not-allowed disabled:opacity-40",
              size === "sm" ? "h-7 px-2 text-[12px]" : "h-8 px-3 text-[13px]",
              on ? "bg-ink/[0.09] text-ink shadow-[0_1px_2px_rgb(0_0_0/0.18)]" : "text-ink-secondary hover:text-ink",
            )}
          >
            {Icon && <Icon size={14} className="shrink-0" aria-hidden="true" />}
            <span className="truncate">{item.label}</span>
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}
