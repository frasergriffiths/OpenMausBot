import type { ReactNode } from "react";

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border-[0.5px] border-hairline bg-control px-1 font-mono text-[10px] text-ink-secondary">
      {children}
    </kbd>
  );
}
