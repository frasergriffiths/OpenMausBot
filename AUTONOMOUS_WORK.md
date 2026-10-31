# Autonomous work log

Read this first in a new session, then check git log and the PR.

## Objectives

A Grok-inspired overhaul of MausBot, delivered in one PR (#23, branch
redesign/grok-inspired, base main): shared component library used everywhere,
new navigation, redesigned mascots, rebuilt Settings/Defaults/Team Map,
Threads replaced by Reset Context, Maus account/sync/mobile/cloud removed,
Boat and self-hosted VPS preserved.

## Completed

- Phase 2 — component library (src/components/ui), 21 primitives; 67 settings
  screens migrated; SettingsPrimitives deleted, and its last two test files
  moved onto `src/components/ui` or deleted with the module.
- Product Hunt launch card removed, with its notice id and queue slot.
- Activity and run-log side panels removed: pages, nav rows, menu entries, lazy
  chunks, components, store flags, tests.
- Tool activity rows redesigned (status dot, no green tick, quiet chrome).
- Compact sidebar density removed from the type and every branch.
- Side panel collapses the sidebar to mascots and restores its saved width;
  Profile/Library/Computer are a real tab list.
- Halloween skin, costumes, carved bodies and generator deleted.
- Dead DataPanel tree and the composer data context removed.
- AI avatar generation removed end to end: UI, tabs, onboarding button, hook
  path, /avatar/generate, /api/bot-defaults/avatar, avatar-image.ts, imageGen
  config, env keys, usage counters.
- Remaining dialog checkboxes moved to the shared component.
- Mascot set redesigned: nine bodies (Mochi, Circle, Pebble, Hexagon, Diamond,
  Star, Sparkle, Wedge, Cloud) and ten hues; custom uploads removed.
- The chromium/silver colours are gone from the palette, the default bot, the
  onboarding fallback, the identity CSS tokens and the dead mascot builders.
- Threads are hidden: one conversation per bot, Reset Context replaces them.

## Push mechanics

Pushes go through the Maus GitHub connection, not a local `git push`: the
cloud box holds no GitHub credentials. That call takes plain UTF-8 file
contents, so a file near or over ~1 MB (src/locales/source-hashes.json, 6.3 MB)
cannot be pushed that way. Do not regenerate the locale hash manifest here.

## Current state

Phases 1-4 are done. Phase 6 is half done: the conversation menu no longer
offers New thread or the thread switcher, and `useShowThreadsChoice()` returns
false for good, but the thread rows, expand chevrons and thread-list components
are still in the tree behind that hard false.

## Remaining, in order

1. Phase 2 — roll the primitives across the rest of chat, composer and
   onboarding. About 18 hand-rolled buttons remain in ChatView, ChiefIntro,
   MeetScreen, SignInPill and ConnectAi, and the legacy `.ui-button` /
   `.ui-pill` CSS is still the parallel implementation behind them.
2. Phase 5 — the rest of Settings, the Defaults dialog polish and the Team Map
   dialogs. Twenty settings screens and eight bot-settings screens still
   hand-roll buttons, selects or checkboxes.
3. Phase 6 — delete the Threads UI itself: the thread-list components and their
   tests, and the `showThreads` parameter threaded through 31 files, now that
   nothing can turn threads on.
4. Phase 7 — Maus account/sync/mobile/cloud removal, keeping Boat and a
   self-hosted VPS: CloudAccountSettings, billing, cloud-buy, cloud-plan,
   cloud-send/files, electron/cloud-account.mjs, cloud-home.mjs,
   cloud-team-plan.mjs and their server routes.
5. Phase 8 — integration, polish, CI green.

## Known issues

- server/config.test.ts has two cases that cannot pass on this cloud box:
  "sees a change of permissions or owner on the next call" and "uses the list
  again once a file the server could not read is readable". They chmod a file
  to 000 and expect the read to fail; this container's filesystem does not
  enforce permission bits (`chmod 000 f; cat f` still prints the file as uid
  1000), so the read succeeds. They pass on GitHub's ubuntu-latest runners. Not
  a regression: the branch does not touch what either case exercises.

## Verification performed

`pnpm typecheck` (renderer and server) green; `pnpm lint` 0 warnings, 0
errors; `pnpm i18n:check` green; `pnpm check:electron` green;
`node scripts/check-skin-contrast.mjs` green; the vitest suite run in three
shards on the cloud box. The dev app boots and renders first-run onboarding in
the cloud desktop browser, and the mascot and shapes preview pages render the
new nine-body, ten-hue set.
