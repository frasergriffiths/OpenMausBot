import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/** One chevron: size and stroke are paired so the drawn weight is ~1px at every step. */
export const CHEVRON_SIZE = { inline: 12, row: 14, control: 16 } as const;
export const CHEVRON_STROKE = { inline: 2, row: 1.75, control: 1.75 } as const;

/** Quiet at rest, one motion for every rotation. */
export const CHEVRON_BASE =
  "shrink-0 text-ink-tertiary transition-transform duration-150 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none";
export const CHEVRON_CLOSED = "-rotate-90 rtl:rotate-90";
export const CHEVRON_OPEN = "rotate-0";
export const CHEVRON_OPEN_UP = "rotate-180";

export function Chevron({ open, kind = "disclosure", size = "row", className, ...rest }: {
  open?: boolean;
  kind?: "disclosure" | "menu";
  size?: keyof typeof CHEVRON_SIZE;
} & Omit<ComponentProps<typeof ChevronDown>, "size" | "strokeWidth">) {
  return (
    <ChevronDown
      size={CHEVRON_SIZE[size]}
      strokeWidth={CHEVRON_STROKE[size]}
      aria-hidden="true"
      className={cn(
        CHEVRON_BASE,
        kind === "menu"
          ? (open ? CHEVRON_OPEN_UP : CHEVRON_OPEN)
          : (open === true ? CHEVRON_OPEN : CHEVRON_CLOSED),
        className,
      )}
      {...rest}
    />
  );
}

/** The three marker mechanisms a native <summary> needs; display:flex is applied by the caller. */
export const SUMMARY_MARKERS = "list-none [&::-webkit-details-marker]:hidden";
