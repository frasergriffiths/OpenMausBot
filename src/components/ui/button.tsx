import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "icon";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110 active:brightness-95",
  secondary: "border-[0.5px] border-hairline bg-control text-ink hover:bg-raised-hover",
  ghost: "text-ink-secondary hover:bg-ink/[0.06] hover:text-ink",
  danger: "border-[0.5px] border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-[13px]",
  md: "h-9 gap-2 rounded-[10px] px-4 text-[14px]",
  icon: "size-8 rounded-lg",
};

export function buttonStyles({
  variant = "secondary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
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
    className,
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, className })}
    >
      {loading && <Loader2 size={size === "sm" ? 13 : 15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
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
      className={buttonStyles({
        variant,
        className: cn(size === "sm" ? "size-7 rounded-md" : "size-8 rounded-lg", className),
      })}
    >
      {children}
    </button>
  );
}
