import { useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-[10px] border-[0.5px] border-hairline bg-inset px-3 text-[14px] text-ink placeholder:text-ink-tertiary " +
  "transition-[border-color,box-shadow,background-color] duration-150 ease-out motion-reduce:transition-none " +
  "hover:border-ink-tertiary/60 focus:border-accent-border focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus " +
  "disabled:cursor-not-allowed disabled:opacity-45";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={cn(CONTROL, "h-9", className)} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(CONTROL, "min-h-20 resize-y py-2 leading-relaxed", className)} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={cn(
        CONTROL,
        "h-9 cursor-pointer appearance-none bg-[length:14px] bg-[right_10px_center] bg-no-repeat pr-8",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 5 4 4 4-4'/%3E%3C/svg%3E\")",
        ...props.style,
      }}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children?: ReactNode;
  className?: string;
}) {
  const generated = useId();
  const id = htmlFor ?? generated;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[12px] font-medium text-ink-secondary">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-[12px] leading-[1.4] text-ink-tertiary">{hint}</p>
      )}
    </div>
  );
}
