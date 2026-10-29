# The composer’s “/” menu — 0.1.142 spec
Design: Nova. Build: Lens. Read against `release/0.1.142`. Read-only: no code changed.

## 1. What it is

**Typing `/` at the start of the composer opens a filtered command list; choosing a row puts that command into the message or turns on goal mode — it never sends.** The person’s first act is to keep typing the command’s name, not to browse.

## 2. Layout and hierarchy

**Two sections, in this order: Commands, then Skills.** Commands change what the composer/thread does (/goal, /learn, /setup); skills insert a command the bot runs on send. Grouping by what a pick *does* is the only split a person needs before reading the descriptions — a quieter per-row “skill” tag still makes them read fifteen mixed rows, so the tag goes and the section carries the type.

**Container** — the shared menu surface, 360px:

```
popover-surface flex max-h-80 w-[min(22.5rem,calc(100%-1rem))] flex-col overflow-hidden rounded-[var(--radius-menu)] border border-hairline/50 bg-menu p-1.5 shadow-lg [&_svg.lucide]:stroke-[1.5]
```

- No bespoke header. The first section label is the header.
- The list is one scroller between the container’s padding and the footer: `min-h-0 flex-1 overflow-y-auto overscroll-contain` with `[mask-image:linear-gradient(to_bottom,black_calc(100%-12px),transparent)]` for the bottom fade.
- The footer is `shrink-0`, outside the scroller.

**Section label** — `MENU_LABEL` plus a count on the right, sticky:

```
sticky top-0 z-[1] -mx-1.5 flex h-6 items-end gap-2 bg-menu px-3.5 pb-0.5 text-[12px] font-medium leading-4 text-ink-tertiary
```

- “Commands” (`composer.commands.title`, exists) has no count (three rows at most).
- “Skills” (`composer.commands.skills`, new) shows `{count}` in `tabular-nums` at the end, only when there are skills.
- No section when it has no rows.

**Row anatomy** — `SIMPLE_MENU_ROW` with a 44px floor, 16px gutter, no accent tile:

```
cn(SIMPLE_MENU_ROW, "min-h-11")
```

- Gutter: `MENU_GUTTER` (16px), icon 16px `text-ink-secondary`; `/goal` Target, `/learn` BookOpen, `/setup` Settings2, skill Sparkles. The icon is a cue, not a state — never accent.
- Text block: `flex min-w-0 flex-1 flex-col gap-0.5`.
- Label: `truncate text-[13px] leading-[18px] text-ink` — **ink, not accent**; one weight (medium) for every label, so selection is the fill alone.
- Description: `truncate text-[12px] leading-4 text-ink-secondary`, one line, full text in `title`. No description → no second line; the row still 44px.
- No per-row type tag. Delete the accent “skill” pill; the section says it.
- Highlighted row: `bg-ink/[0.06]`, no ring, icon and text unchanged. `SIMPLE_MENU_ROW`’s own hover is the same token; `onMouseEnter` also sets the highlight index, so the fill persists on the row the pointer last touched. No second hover style, no accent.

**Footer** — one line, 32px, above the container’s bottom padding:

```
flex h-8 shrink-0 items-center border-t border-ink/10 px-3 text-[11px] leading-4 text-ink-tertiary
```

- Copy: `↑↓ move · ↵ pick · Esc close` (`composer.commands.keys`, new). One string, centred; no keycaps that need their own surface.
- At 320 the string fits 264px at 11px.

**What is deleted from today’s markup**

- `rounded-xl border-hairline/40 bg-raised` → `popover-surface … bg-menu rounded-[var(--radius-menu)]`.
- The 10px uppercase `Commands` header with its own border → `MENU_LABEL` section labels.
- The 32px `bg-accent/10 text-accent` icon tile → `MENU_GUTTER` 16px secondary icon.
- `text-accent` labels and the accent `bg-accent/10` skill pill.
- The single flat `commands.map` → two labelled groups.
- The 40px `px-3 py-2.5` row → 44px `SIMPLE_MENU_ROW`.
- `w-80` → 360 / 264 at 320.

## 3. Tokens

- Surface: `popover-surface`, `bg-menu`, `border-hairline/50`, `rounded-[var(--radius-menu)]`, `shadow-lg`, `p-1.5` — exactly `SidebarPopoverMenu.tsx:374`.
- Rows: `SIMPLE_MENU_ROW` (`menu-recipe.ts:5`), `MENU_GUTTER` (`:12`), `MENU_LABEL` (`:16`), `MENU_SEPARATOR` only if a line is needed (not between sections; the sticky label is the separator).
- Type: label 13/18, description 12/16, section label 12/16, footer 11/16. No 10px uppercase, no 14px accent.
- Radii: container `var(--radius-menu)`; rows `rounded-md`.
- Colours: ink for labels, ink-secondary for descriptions/icons, ink-tertiary for section labels/footer/count, `bg-ink/[0.06]` for the highlight. Accent appears nowhere in this menu.
- Spacing: container 6px, row 8px horizontal, 4px vertical, 8px icon gap, 2px label-to-description.
- Edges: no border on rows; the only border is the container and the footer’s 1px top hairline.
- `SIMPLE_CONTROL` is for round composer buttons, not rows; do not use it. `SettingsGroup`/`SettingRow` are for settings pages, not this popover; do not use them. Nothing may import `useAdvancedMode`.

## 4. States

- **No match for the query**: the menu stays open and shows a centred empty state, `px-3 py-6 text-[12px] leading-4 text-ink-secondary`: `No commands match “{query}”` (`composer.commands.noMatch`, new), then `Type / to see every command` (`composer.commands.noMatchHint`, new) in `text-ink-tertiary`. The footer stays. If there are **zero available commands before filtering**, do not open the menu at all.
- **One command**: one section + one 44px row; no empty Skills heading, no reserved space.
- **30 skills**: max 320px; Commands (3 × 44) + the Skills label + skills; the scroller; the label sticks, the count reads 30; the highlighted row scrolls into view with `block: "nearest"`.
- **Skill with no description**: one line, the 44px floor keeps the target; no blank second line, no “No description”.
- **Very long name**: label truncates; `title` and the option’s accessible name carry the full text; row height unchanged.
- **Unavailable command**: not listed. The list is built from what is available (`/learn` only when authoring is on, `/setup` only when the engine supports agents); a disabled row would be a dead end. If a future surface must show one, it is `aria-disabled="true"`, `opacity-45`, no hover, skipped by arrows, Enter does nothing.
- **Keyboard highlight vs hover**: one state. `onMouseEnter` sets the same `highlight` index the arrows set; the row renders `bg-ink/[0.06]` and `aria-selected`. No CSS `:hover` fill of its own, so a mouse row and a keyboard row can never look different.

## 5. Interaction

- `ArrowDown` / `ArrowUp`: next/previous, wrapping; `Home` / `End`: first/last (add these; today only the two arrows).
- `Enter` / `Tab`: pick the highlighted row (today); `Escape`: close and keep the `/` text in the input, dismissed until the trigger start changes (today).
- Mouse: `onMouseDown` prevents focus loss (today); `onMouseEnter` sets highlight; `click` picks.
- **Pick effects**:
  - `/goal` — clears the trigger, turns on goal mode (the Goal chip lights), closes, focus and caret in the input. Nothing is sent.
  - `/learn` — replaces the trigger with `/learn ` (trailing space), caret after it, closes, focus in the input. The person adds what to learn.
  - `/setup` — replaces the trigger with `/setup `, same.
  - A skill — inserts `/{skill} `, caret after it, closes, focus in the input. The skill runs when the message is sent, not on pick.
- The list closes on every pick; nothing stays open. The menu is a picker, not a palette with submenus.
- The descriptions now say the effect in plain words; keep the existing `composer.command.*Desc` strings (they already say “Keep this bot working…”, “Draft a reusable skill…”, “Have this bot interview you…”).

## 6. Accessibility

- The composer input (textarea) becomes a **combobox while a picker is open**: `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded="true"`, `aria-autocomplete="list"`, `aria-controls="composer-slash-menu"`, `aria-activedescendant="composer-slash-option-{highlight}"`. Remove those attributes when no picker is open (leave the textarea as it is today). Slash and mention are mutually exclusive; point the attributes at whichever is open.
- Listbox: `id="composer-slash-menu"`, `role="listbox"`, `aria-label={t("composer.commands.aria")}`. Options: `id="composer-slash-option-{index}"`, `role="option"`, `aria-selected={index === highlight}`, `tabIndex={-1}` (the input keeps focus; the list is never a tab stop).
- Groups: wrap each section in `role="group" aria-labelledby="composer-slash-{commands|skills}"`; the sticky label carries that id. Do not use `role="presentation"` on the labels.
- Announce the filtered count once: one visually hidden `<span role="status" className="sr-only">` near the input, text `1 command` / `{count} commands` (`composer.commands.resultOne` / `resultOther`, new), or “No commands match”. Update on the count, not on every render. Do not put `aria-live` on the listbox or on each row.
- Escape closes with focus still in the textarea; pick returns focus and sets the caret (already in `pickCommand`); Tab picks and does not move focus out.
- Row icons and the section count are `aria-hidden`; the option’s accessible name is the label plus its description (the description is inside the button; no separate `aria-label` needed unless the truncation hides it — if truncated, set `title` and `aria-label` to the full text).
- The empty state is `role="status"`? No: the count live region already says “No commands match”; the visible empty copy is plain text.

## 7. Both composer layouts

- **Simple/compact composer** (`SIMPLE_COMPOSER`, rounded 22, p-2): the menu is anchored to the **composer shell**, not the outer wrapper. Move `SlashCommandMenu` and `MentionMenu` inside the shell’s relative container (or a wrapper around only the shell), with `absolute bottom-full left-2 z-40 mb-2`. It then sits exactly 8px above the input, even when failed-send rows or a pending approval card are above the composer. The menu may cover those transient panels while open; it closes on pick/Escape.
- **Full composer** (`rounded-2xl bg-composer px-2 py-1.5 ring`): same anchor and 8px gap; same 360 width; the menu’s left edge aligns with the input’s inner left (`left-2` = the shell’s 8px padding).
- **Phone** (`singleRow` dock, + beside the pill): anchor to the composer wrapper (the pill is too narrow), `left-2 right-2`, width `auto`; max height `min(20rem,50dvh)` so it never reaches the header; 8px above the dock. No horizontal overflow at 320: the menu is 264px inside the 280px wrapper.
- **1024 / 1440**: 360px wide, left-aligned to the composer shell; it does not centre or stretch with the chat column.
- **Widths**: 360px desktop, `calc(100% - 1rem)` at 320/phone (264px). Never narrower than 240.

## 8. Motion

- Reuse `useMenuMotion` unchanged: `MENU_MOTION_MS = 200`, `--animate-pop-in`/`--animate-pop-out` with the existing `cubic-bezier(0.22, 1, 0.36, 1)`, reduced-motion override already in `styles.css`.
- Add `origin-bottom` to the menu so it grows from the input; the transform is the existing pop, not a new one.
- The menu is absolutely positioned and its height is capped: opening, closing and filtering never move the composer or the chat. Rows do not stagger; the highlight changes instantly. At most 30 rows render; no virtualization, no scroll listener, no per-keystroke state beyond the existing candidates memo and the highlight. The bottom fade is a static mask, not a JS fade.

## 9. Files and copy

- Rewrite `src/components/SlashCommandMenu.tsx`; keep its props (`listRef`, `motion`, `commands`, `highlight`, `onPick`, `onHighlight`).
- `src/components/Composer.tsx`: open condition for the empty state (`available > 0`), combobox/aria-activedescendant wiring, the count live region, the anchor move, Home/End.
- New strings in all 15 catalogs: `composer.commands.skills` = “Skills”, `composer.commands.keys` = “↑↓ move · ↵ pick · Esc close”, `composer.commands.noMatch` = “No commands match “{query}””, `composer.commands.noMatchHint` = “Type / to see every command”, `composer.commands.resultOne` = “1 command”, `composer.commands.resultOther` = “{count} commands”. Delete `composer.command.skillTag` if nothing else uses it.
- Reuse `menu-recipe.ts` exports and `SidebarPopoverMenu`’s surface classes; no `useAdvancedMode`, no `SettingsGroup`.
