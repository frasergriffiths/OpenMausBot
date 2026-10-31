import { useId, type ReactNode } from "react";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/cn";

export function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  label,
  hint,
  disabled = false,
  className,
  id,
  name,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  const generated = useId();
  const inputId = id ?? generated;
  const hintId = hint ? inputId + "-hint" : undefined;
  const marked = checked || indeterminate;

  return (
    <label className={cn("flex items-start gap-2.5", disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer", className)}>
      <span className="relative flex shrink-0 items-center justify-center pt-[1px]">
        <input
          id={inputId}
          name={name}
          type="checkbox"
          className="peer absolute inset-0 z-10 size-[18px] cursor-[inherit] opacity-0"
          checked={checked}
          disabled={disabled}
          aria-label={label ? undefined : ariaLabel}
          aria-describedby={[describedBy, hintId].filter(Boolean).join(" ") || undefined}
          ref={(node) => {
            if (node) node.indeterminate = indeterminate;
          }}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span
          aria-hidden="true"
          className={cn(
            "flex size-[18px] items-center justify-center rounded-[5px] border",
            "transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out motion-reduce:transition-none",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
            marked ? "border-accent bg-accent text-accent-ink" : "border-hairline bg-control",
            !disabled && "peer-hover:border-ink-tertiary",
            "peer-active:scale-90 motion-reduce:peer-active:scale-100",
          )}
        >
          {indeterminate ? (
            <Minus size={13} strokeWidth={3} className="scale-100 transition-transform duration-150" aria-hidden="true" />
          ) : (
            <Check
              size={13}
              strokeWidth={3}
              aria-hidden="true"
              className={cn(
                "transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
                checked ? "scale-100 opacity-100" : "scale-50 opacity-0",
              )}
            />
          )}
        </span>
      </span>
      {(label || hint) && (
        <span className="min-w-0 flex-1 select-none">
          {label && <span className="block text-[13px] leading-[1.4] text-ink">{label}</span>}
          {hint && <span id={hintId} className="mt-0.5 block text-[12px] leading-[1.4] text-ink-secondary">{hint}</span>}
        </span>
      )}
    </label>
  );
}
