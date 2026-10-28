import { createElement, type ReactNode } from "react";

export const inputCls =
  "ui-field w-full";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return createElement(
    "label",
    { className: "block" },
    createElement("div", { className: "mb-1.5 text-[13px] text-ink-secondary" }, label),
    children,
  );
}
