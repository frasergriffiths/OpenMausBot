import { Search, X } from "lucide-react";

import { cn } from "@/lib/cn";

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-2.5 text-ink-tertiary" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-8 w-full rounded-lg border-[0.5px] border-hairline/70 bg-inset pl-8 pr-8 text-[13px] text-ink",
          "placeholder:text-ink-tertiary transition-colors duration-150 motion-reduce:transition-none",
          "focus:border-accent-border focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-1.5 flex size-5 items-center justify-center rounded text-ink-tertiary hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          <X size={12} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
