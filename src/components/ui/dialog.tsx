import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";
import { IconButton } from "./button";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
  closeLabel = "Close",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  closeLabel?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 max-sm:items-end max-sm:p-0">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in motion-reduce:animate-none"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "relative flex max-h-[min(88vh,46rem)] w-full flex-col overflow-hidden",
          "rounded-[18px] border-[0.5px] border-hairline bg-panel shadow-2xl",
          "animate-pop-in motion-reduce:animate-none max-sm:rounded-b-none max-sm:rounded-t-[20px]",
          size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-lg",
          className,
        )}
      >
        {(title || description) && (
          <header className="flex items-start gap-3 px-5 pb-1 pt-5">
            <div className="min-w-0 flex-1">
              {title && <h2 id={titleId} className="text-[16px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>}
              {description && <p id={descriptionId} className="mt-1 text-[13px] leading-relaxed text-ink-secondary">{description}</p>}
            </div>
            <IconButton label={closeLabel} onClick={onClose} size="sm" variant="ghost">
              <X size={15} />
            </IconButton>
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t-[0.5px] border-hairline/60 px-5 py-3.5">{footer}</footer>}
      </div>
    </div>
  );

  return typeof document === "undefined" ? content : createPortal(content, document.body);
}
