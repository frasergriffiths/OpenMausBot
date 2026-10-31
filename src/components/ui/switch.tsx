import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export function Switch({
  checked,
  className,
  ...props
}: Omit<ComponentProps<"button">, "children" | "role" | "aria-checked"> & { checked: boolean }) {
  return (
    <button
      {...props}
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none",
        "in-data-[settings-look=simple]:h-5 in-data-[settings-look=simple]:w-8",
        checked
          ? "bg-accent"
          : "bg-control in-data-[settings-look=simple]:bg-ink/[0.12] in-data-[settings-look=simple]:ring-1 in-data-[settings-look=simple]:ring-ink/45 in-data-[settings-look=simple]:ring-inset",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-[left] duration-200 ease-out motion-reduce:transition-none",
          "in-data-[settings-look=simple]:top-0.5 in-data-[settings-look=simple]:size-4",
          checked ? "left-[21px] in-data-[settings-look=simple]:left-[14px]" : "left-[3px] in-data-[settings-look=simple]:left-0.5",
        )}
      />
    </button>
  );
}
