import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

export interface MenuItem {
  id: string;
  label: ReactNode;
  icon?: LucideIcon;
  hint?: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
}

const selector = (id: string) => '[data-menu-item="' + id + '"]';

export function DropdownMenu({
  trigger,
  items,
  align = "end",
  label,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLSpanElement | null>(null);
  const button = useRef<HTMLButtonElement | null>(null);
  const list = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const enabled = items.filter((item) => !item.disabled);
  const focusItem = (index: number) => {
    const next = enabled[index];
    if (!next) return;
    list.current?.querySelector<HTMLElement>(selector(next.id))?.focus();
  };

  return (
    <span ref={root} className="relative inline-flex">
      {trigger({ open, toggle: () => { setOpen(!open); setActive(0); } })}
      {open && (
        <div
          ref={list}
          role="menu"
          aria-label={label}
          className={cn(
            "absolute top-[calc(100%+4px)] z-50 min-w-48 overflow-hidden rounded-xl border-[0.5px] border-hairline bg-menu p-1 shadow-xl",
            "animate-pop-in motion-reduce:animate-none",
            align === "end" ? "right-0" : "left-0",
          )}
          onKeyDown={(event) => {
            const current = enabled.findIndex((item) => list.current?.querySelector(selector(item.id)) === document.activeElement);
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              button.current?.focus();
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const step = event.key === "ArrowDown" ? 1 : -1;
              const next = current === -1 ? 0 : (current + step + enabled.length) % enabled.length;
              setActive(next);
              focusItem(next);
            } else if (event.key === "Home" || event.key === "End") {
              event.preventDefault();
              const next = event.key === "Home" ? 0 : enabled.length - 1;
              setActive(next);
              focusItem(next);
            } else if (event.key === "Tab") {
              setOpen(false);
            }
          }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                tabIndex={item.id === enabled[active]?.id ? 0 : -1}
                data-menu-item={item.id}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px]",
                  "transition-colors duration-100 motion-reduce:transition-none",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
                  "disabled:pointer-events-none disabled:opacity-40",
                  item.danger ? "text-danger hover:bg-danger/10" : "text-ink hover:bg-ink/[0.07]",
                )}
              >
                {Icon && <Icon size={14} className="shrink-0 opacity-80" aria-hidden="true" />}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && <span className="text-[11px] text-ink-tertiary">{item.hint}</span>}
              </button>
            );
          })}
        </div>
      )}
    </span>
  );
}
