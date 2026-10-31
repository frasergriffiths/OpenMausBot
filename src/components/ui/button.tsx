import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "chip";
export type ButtonSize = "sm" | "md" | "xs" | "icon";
export type ButtonShape = "default" | "pill";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110 active:brightness-95",
  secondary: "border-[0.5px] border-hairline bg-control text-ink hover:bg-raised-hover",
  ghost: "text-ink-secondary hover:bg-ink/[0.06] hover:text-ink",
  danger: "border-[0.5px] border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
  chip: "border-[0.5px] border-hairline/40 bg-panel text-ink-secondary hover:bg-raised hover:text-ink",
};

const SIZE: Record<ButtonSize, string> = {
  xs: "h-7 gap-1.5 rounded-lg px-2.5 text-[13px]",
  sm: "h-8 gap-1.5 rounded-lg px-3 text-[13px]",
  md: "h-9 gap-2 rounded-[10px] px-4 text-[14px]",
  icon: "size-8 rounded-lg",
};

const SHAPE: Record<ButtonShape, string> = {
  default: "",
  pill: "max-w-full min-w-0 rounded-full px-3 font-medium",
};

export function buttonStyles({
  variant = "secondary",
  size = "md",
  shape = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center font-medium",
    "transition-[background-color,color,box-shadow,transform,filter] duration-150 ease-out motion-reduce:transition-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    "disabled:pointer-events-none disabled:opacity-45",
    "active:scale-[0.98] motion-reduce:active:scale-100",
    VARIANT[variant],
    SIZE[size],
    SHAPE[shape],
    className,
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  shape = "default",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-ui="button"
      data-variant={variant}
      data-shape={shape === "pill" ? "pill" : undefined}
      className={buttonStyles({ variant, size, shape, className })}
    >
      {loading && <Loader2 size={size === "sm" || size === "xs" ? 13 : 15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  size = "md",
  variant = "ghost",
  className,
  children,
  ...props
}: ComponentProps<"button"> & {
  label: string;
  size?: "sm" | "md";
  variant?: ButtonVariant;
  children: ReactNode;
}) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      aria-label={label}
      title={label}
      data-ui="icon-button"
      className={buttonStyles({
        variant,
        className: cn(size === "sm" ? "size-7 rounded-md" : "size-8 rounded-lg", className),
      })}
    >
      {children}
    </button>
  );
}

