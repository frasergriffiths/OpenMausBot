/** One segmented/pill tab recipe for Simple mode: same track, height, padding and radius everywhere. */
export const PILL_TABS = "flex items-center gap-0.5 rounded-full bg-ink/[0.05] p-[3px]";

export const PILL_TAB =
  "inline-flex min-w-0 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium leading-[18px] transition-[background-color,color] duration-150 ease-out focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50";

export const PILL_TAB_ON = "bg-ink/[0.14] text-ink";
export const PILL_TAB_OFF = "text-ink-secondary enabled:hover:text-ink";

/** Arrow keys, Home and End move between the tabs in a PILL_TABS row and select the one focused. */
export function moveBetweenPillTabs(
  event: { key: string; currentTarget: HTMLElement; preventDefault: () => void },
  select: (tab: HTMLButtonElement) => void,
): void {
  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  if (tabs.length === 0) return;
  // Focus on the row itself is not a tab: ArrowRight starts at the first, ArrowLeft at the last.
  const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
  const next = event.key === "ArrowRight" ? (current + 1) % tabs.length
    : event.key === "ArrowLeft" ? (current < 0 ? tabs.length - 1 : (current + tabs.length - 1) % tabs.length)
      : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
  if (next < 0) return;
  event.preventDefault();
  tabs[next].focus();
  select(tabs[next]);
}
