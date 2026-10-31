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
  screens migrated; SettingsPrimitives deleted.
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

## Push mechanics

The Composio GitHub tool rejects base64 payloads near 1 MB. UTF-8 payloads work
up to about 950 KB (server/index.ts, 922 KB, pushed fine). Use encoding utf-8
and read content with cat. Anything larger must be split or restructured.

## Current phase

Phase 6 — Threads to Reset Context, in progress.

Landed: POST /api/bots/:id/context/reset (creates a fresh thread, optional
handover message, leaves memories/instructions/identity untouched) and the
store's newTask action carrying an optional handover to that route.

Blocked: the chat menu entry needs a new user-facing string, and adding one
means regenerating src/locales/source-hashes.json, which is ~6 MB and beyond
the single-request push limit. Options next session: reuse an existing key, or
find a push path for that file.

## Known issues

- server/config.test.ts: two filesystem-permission cases fail on this container
  ("sees a change of permissions or owner", "uses the list again once a file the
  server could not read is readable"). They mock chmod/stat and do not touch
  image config. Confirm against main before treating as a regression.
- Mascot artwork redesign not started. Live preview works: pnpm dev then
  http://127.0.0.1:5173/mascot-preview.html in the cloud desktop browser;
  screenshot with the computer tool.

## Next action

Threads to Reset Context, first increment: add a resetContext action that starts
a fresh thread for the bot and seeds it with a short bot-written handover,
leaving memories, instructions, description, identity and mascot untouched.
Server route next to the existing thread routes; UI entry in the chat more menu;
tests alongside.

## Verification performed

pnpm typecheck (renderer + server) green at the last commit; oxlint 0/0;
targeted suites for each phase green.
