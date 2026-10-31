import { useId, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface RadioOption {
  value: string;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
}

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  legend,
  className,
  orientation = "vertical",
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  legend: ReactNode;
  className?: string;
  orientation?: "vertical" | "horizontal";
}) {
  const id = useId();
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="mb-2 text-[12px] font-medium text-ink-secondary">{legend}</legend>
      <div className={cn("flex gap-2", orientation === "vertical" ? "flex-col" : "flex-row flex-wrap")}>
        {options.map((option) => {
          const optionId = id + "-" + option.value;
          const on = option.value === value;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                "group flex cursor-pointer items-start gap-2.5 rounded-[10px] border-[0.5px] px-3 py-2",
                "transition-[background-color,border-color] duration-150 motion-reduce:transition-none",
                on ? "border-accent/50 bg-accent/[0.08]" : "border-hairline/60 hover:bg-ink/[0.04]",
                option.disabled && "cursor-not-allowed opacity-45",
              )}
            >
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={on}
                disabled={option.disabled}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "mt-[2px] flex size-[16px] shrink-0 items-center justify-center rounded-full border",
                  "transition-colors duration-150 motion-reduce:transition-none",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
                  on ? "border-accent" : "border-hairline group-hover:border-ink-tertiary",
                )}
              >
                <span className={cn("size-[8px] rounded-full bg-accent transition-transform duration-150 motion-reduce:transition-none", on ? "scale-100" : "scale-0")} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] leading-[1.4] text-ink">{option.label}</span>
                {option.hint && <span className="mt-0.5 block text-[12px] leading-[1.4] text-ink-secondary">{option.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
