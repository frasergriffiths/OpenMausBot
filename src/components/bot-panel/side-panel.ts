import { cn } from "@/lib/cn";

export const BOT_PANEL_ID = "bot-panel";

export const sidePanelCls = (overlay: boolean, simple = false) => cn(
  "absolute inset-0 z-40 flex h-full min-w-0 flex-col outline-none focus-visible:outline-none",
  simple && !overlay ? "border-s-[0.5px] border-ink/[0.06] bg-app" : "border-s border-hairline/40 bg-panel",
  overlay
    ? simple
      ? "inset-y-0 left-auto right-0 w-[320px] max-w-full border-s-[0.5px] border-ink/[0.08] shadow-2xl"
      : "md:inset-auto md:right-0 md:top-0 md:bottom-0 md:shadow-2xl md:w-[min(420px,42vw)]"
    : "md:relative md:z-auto md:shrink-0 md:w-[var(--side-panel-width)]",
);
