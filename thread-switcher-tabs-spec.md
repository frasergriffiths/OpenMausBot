# Thread switcher: pill vs browser tabs — 0.1.141 spec
Design: Nova. Build: Lens. Read against `release/0.1.141` at 43c64cbee. Read-only: no code changed.

## 1. The setting

**Row** — new `ThreadChipStyleRow` in `src/components/AppearanceSelectRows.tsx`, mirroring `FontRow`:

- `SettingRow title={t("settings.threadChip.title")} subtitle={t("settings.threadChip.subtitle")}`
- `Select size="sm" className="w-full max-w-[240px]" aria-label={t("settings.threadChip.aria")}`
- Options: `pill` → **One pill**, `tabs` → **Browser tabs**

Copy (en, then translated):

- `settings.threadChip.title` = **Conversation switcher**
- `settings.threadChip.subtitle` = **One pill is the current look. Browser tabs show every conversation across the top of the chat.**
- `settings.threadChip.aria` = **Conversation switcher style**
- `settings.threadChip.pill` = **One pill**
- `settings.threadChip.tabs` = **Browser tabs**

The default reads as today because **One pill** is first and is the stored default; do not write "(current)" into an option label — it becomes wrong the moment tabs are chosen.

**Storage** — `openmausbot.threadChipStyle`, values `"pill" | "tabs"`, default `"pill"`. Add to `src/lib/sidebar-preferences.ts` (same file, same shape as the tools-layout setting):

```ts
export type ThreadChipStyle = "pill" | "tabs";
export const THREAD_CHIP_STYLE_KEY = "openmausbot.threadChipStyle";
export const THREAD_CHIP_STYLES: readonly ThreadChipStyle[] = ["pill", "tabs"];
export function parseThreadChipStyle(value: string | null): ThreadChipStyle { return value === "tabs" ? "tabs" : "pill"; }
export function loadThreadChipStyle(storage?: Pick<Storage,"getItem">|null): ThreadChipStyle
export function saveThreadChipStyle(style: ThreadChipStyle, storage?: Pick<Storage,"setItem">|null): void
export function setThreadChipStyle(style: ThreadChipStyle): void   // session + save + notify
export function useThreadChipStyle(): ThreadChipStyle              // useSyncExternalStore, server "pill"
```

Mirror `useSidebarToolsLayout` exactly: module-level session choice, listener set, `storage` event that ignores other keys/storage areas, and a `"pill"` server snapshot. A missing or malformed value is `pill`.

**Mount** — `SettingsModal.tsx` `case "appearance"` after `ShowThreadsRow` (line 353). Because Simple is the person's mode, also mount the same row on `SimpleLooksPage` (`SettingsSimplePages.tsx:92-98`) directly under `<SkinPicker />`; one component, two mounts, no second design.

## 2. Tab strip

Only when `useThreadChipStyle() === "tabs"`; the `threadChipVisible` gate and phone hide stay above both variants.

**Structure** inside the existing `data-chathead-tabbar` slot:

```tsx
<div className="flex min-w-0 flex-1 items-center gap-1">
  <div role="tablist" aria-label={t("task.list")}
       className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    …tabs…
  </div>
  <button data-thread-new … />        {/* pinned */}
  <button data-thread-archived … />   {/* pinned */}
</div>
```

**Tab box** — `h-8` (32px, the same as the pill; the header never changes height):

```
group relative flex h-8 min-w-[8rem] max-w-52 shrink-0 items-center gap-1 rounded-xl pl-2 pr-0.5 text-[12px] leading-4 text-ink-secondary
```

- Active: `bg-inset text-ink`
- Idle: `hover:bg-ink/[0.04]`
- Focus: `focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus`
- `role="tab" aria-selected={active} tabIndex={active ? 0 : -1}` and `title={`${fullTitle}${status ? ` · ${status}` : ""}`}`

**Leading slot** — always 16px, so no status change moves anything:

```
relative flex size-4 shrink-0 items-center justify-center
```

Inside it, one of:

- waiting on you: `Clock size={13} className="text-warning"`
- working: `Loader2 size={13} className="animate-spin" style={{ color: spinnerColor(bot.color) }}`
- archived current: `Archive size={13} className="text-ink-tertiary"`
- idle: `MessageSquare size={13} className="text-ink-tertiary"`

Unread adds a dot over the slot, never a new line or width: `absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-accent` (on the current tab, no dot — opening reads it).

Queued count uses the same 16px slot, replacing the idle icon when the thread is queued and not working:

```tsx
<span className="flex size-4 items-center justify-center rounded-full bg-ink/[0.08] text-[10px] font-medium tabular-nums text-ink">
  {count > 9 ? "9+" : count}
</span>
```

If the thread is also working, the spinner wins the slot and the count lives in the title/aria text only. Never add a second badge.

**Title** — `min-w-0 flex-1 truncate px-0.5`; `dir="auto"`.

**Close** — always present, 24px, right side:

```
flex size-6 shrink-0 items-center justify-center rounded-md text-ink-secondary hover:bg-inset hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus
```

`X size={13}`, `aria-label={t("sidebar.bot.archiveAria", { name: title })}` (already translated; reads “Archive {title}”), `title` = Archive. **Closing archives, never deletes**: archive is reversible, keeps the conversation, and is the existing row action; delete stays destructive and lives only in the archived list (item 4). Archiving the current tab selects the next active tab, then archives. If it is the only active thread, archive it but keep its tab visible as the archived-current tab (archive icon) so the open chat still has a tab.

**“+”** — pinned after the scroller:

```
flex size-7 shrink-0 items-center justify-center rounded-lg text-ink-secondary hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus
```

`Plus size={16}`, `aria-label`/`title` = **New thread** (`task.newShort`), `dispatch({ type: "newTask", botId })`. It is the only new-thread entry point in tabs mode.

**Archived button** — same 28px recipe, `Archive size={15}`, `aria-label`/`title` = **Archived threads** (`task.archived`), opens the archived list (item 4).

## 3. Counts and overflow

- Tab width: `min-w-[8rem]` (128px), `max-w-52` (208px); the title truncates inside.
- Overflow is **horizontal scroll**, not a count collapse: this strip is the switcher, and a “+N” would hide exactly the conversations it exists to show.
- The active tab scrolls into view on mount and on every switch: `activeRef.scrollIntoView({ block: "nearest", inline: "nearest" })` in a layout effect, `behavior` default (no smooth).
- At **5 threads**: at 1024 the left header column fits 2–3 tabs and the strip scrolls; on a wide window all 5 show. The active is always visible.
- At **12 and 30**: the strip shows a window of tabs, the active centred into view; `+` and Archived stay pinned. No layout shift, no wrapping to a second row, and the centre identity block never moves because it lives in its own grid column (`ChatView.tsx:1022` and the `@min-[30rem]` grid).
- Status changes never resize a tab: leading slot fixed 16, close fixed 24, count inside the slot, unread a dot. Title changes can resize a tab, but rename is gone from the thread UI.

## 4. What happens to the popover

The strip replaces the **pill and its popover for active threads**; the popover survives only for archived threads:

- Active threads: one entry point each, in the strip. No chevron, no menu per tab, no duplicate in a list.
- Archived threads: the Archived button opens the existing `ThreadSwitcher` anchored to it, in a new `scope="archived"` mode that lists **only archived threads not currently shown as the archived-current tab**. Rows keep Restore and Delete, the existing menu, and the existing archive/restore/delete actions.
- The archived popover is the only place Delete exists; the strip's X only archives. One entry per thread, nothing twice.
- The current archived thread is in the strip (archive icon) and is excluded from the archived list.

## 5. 320px, 1024px and the drag region

- **320px**: phone layout (`<768px`) hides the whole tabbar via `threadChipVisible` (`ChatView.tsx:828`), exactly as the pill is hidden today. No strip, no +, no overflow.
- **Narrow desktop container** (`<30rem/chathead`, e.g. a 760px window with a wide identity block): the header row wraps as it does now; the tabbar takes its own full-width line, 32px tall, and scrolls horizontally. Tabs `min-w-[8rem]` mean two are visible; nothing overflows the page.
- **1024px**: desktop three-column header (tabbar 1fr / identity auto / controls 1fr). The strip uses the free left column (~300px), the identity stays centred, and the strip scrolls within its column. The pill today caps at 200px; tabs get more context without moving the identity.
- **Header height**: both variants are 32px; toggling the setting never changes the header height or the chat's vertical position.
- **Drag region**: `headerDragProps` stays on the header row. Every interactive piece — the tab box, its close, `+`, Archived — gets `style={headerNoDragStyle}`. The `role="tablist"` container and the 4px gaps stay draggable, so dragging a gap still moves the window; only the tab boxes themselves opt out, which is also what lets a trackpad scroll the strip when the pointer is over a tab. Do not put `no-drag` on the whole tabbar wrapper: that is the “swallow the drag region” failure.

## 6. Keyboard and screen reader

- `role="tablist"`, `aria-label` = Threads (`task.list`). Each tab `role="tab"`, `aria-selected`, roving `tabIndex` (active 0, rest -1).
- `ArrowLeft` / `ArrowRight`: focus and activate the previous/next tab (automatic activation), stopping at the ends; `Home` / `End`: first/last. Focus and selection move together, so one key press switches the conversation.
- `Enter` / `Space`: select the focused tab (no-op when already selected). `Delete` / `Backspace` on the focused tab: archive, same as the X; `aria-keyshortcuts="Delete"`.
- The close X is a separate button only for the active tab (`tabIndex={active ? 0 : -1}`); Tab from the active tab reaches its X, then `+`, then Archived.
- `Escape`: if the archived popover is open, close it and return focus to the Archived button; otherwise nothing.
- After close/archive: focus moves to the next tab, else `+`. After `+`: focus the new tab. After the archived list closes: focus Archived, or the restored thread’s tab if it was restored and is active.
- Accessible name per tab: `aria-label={`${title}. ${status}`}` where status is waiting / working / N queued / unread / archived. Icons and dots are `aria-hidden="true"`.
- Announce a status change **once**: one visually hidden `role="status"` in the tabbar that says only the **active** tab’s new status. Do not add per-tab live regions, and do not repeat the status in a second sr-only span inside the tab.

## 7. Default look: non-negotiables

With the stored value `pill` (or no key), nothing about today changes:

- `ChatThreadChip` (`ChatThreadBar.tsx`) is untouched: `h-8 min-w-[8rem] w-fit max-w-[min(12.5rem,100%)] rounded-full pl-2.5 pr-2 text-[13px]/18`, the 14px status icon, the truncate title, the chevron, `aria-haspopup="dialog"`, ArrowDown/Up opens, focus returns to the chip.
- `ThreadSwitcher` is untouched for the pill: same portal, `id="thread-switcher"`, anchored list, archive/restore/delete, focus return.
- `data-chathead-tabbar`, the header grid, the identity column, and the phone hide are unchanged; the header stays 32px tall.
- The setting is additive: missing/bad storage = pill; no other setting, copy or class changes.

**Acceptance checks for Lens**

1. Fresh install: Appearance shows **Conversation switcher**, default **One pill**; the chip’s computed height 32, min-width 128, max-width 200, border-radius 9999.
2. Set **Browser tabs**, reload: tabs render; the key reads `openmausbot.threadChipStyle=tabs`; set back to pill, reload: chip identical.
3. 5 tabs at 1024: strip scrolls, active visible, identity still centred; 12 and 30: same, `+`/Archived pinned, no second header row.
4. Status changes (idle→working→waiting→queued→unread): no tab width change, no header height change, no identity move.
5. Close on a non-current tab archives it and it leaves the strip; close on the current tab selects the next, else stays as the archived-current tab; Delete in the archived list deletes; Restore returns it to the strip.
6. Keyboard: arrows switch, Home/End ends, Delete archives, Escape closes the archived list and returns focus.
7. 320: no strip, as today; 760 narrow: strip on its own line, scrolls, no page overflow; dragging a gap moves the window, dragging a tab does not.
