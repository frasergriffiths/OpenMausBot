# OpenMausBot

OpenMausBot (also published as **MausBot**) is the closest open-source alternative to
**Grok Bot**: a desktop app for running a team of AI agents as chats, built around the
same visual idea — a sidebar of bots, a familiar chat window, and an agent working in
the background of every conversation. Every bot is a real agent, driven by a
command-line engine you already have on your machine, with its own working folder,
instructions, skills and memory. Open source under the Apache License 2.0.

## Why OpenMausBot

If you want **Grok Bot's** interface — bots as chats, a sidebar roster, an agent that
works while you watch — but open source and running on models you already pay for,
OpenMausBot is the closest match available today.

## What it does

- **Bots as chats.** Each bot has an engine and model, a working folder, instructions
  (SOUL.md), skills, memory and its own conversation history.
- **Departments and teams.** Bots are grouped into departments with shared
  instructions, shared department memory and rooms where several bots answer.
- **Routines and triggers.** Run a bot on a schedule, or when an app event or webhook
  arrives.
- **Connected apps.** Accounts you connect are available to bots as tools.
- **A browser.** Bots can use a built-in Chrome-based browser with profiles, plus saved
  logins and optional 1Password-backed logins.
- **Computers.** A bot works on this machine, a self-hosted VPS you configure, or a
  cloud desktop from the Boat provider.
- **Keys in one place.** Model-provider keys, OpenCode, Boat, and the optional Jev
  decision model live on **Settings → API keys**.
- **SMS (Experimental).** One Twilio account per installation, a sending number, a
  linked phone and the bot that answers.
- **Import.** Bring a Grok bot's instructions, skills and routines across from a share
  link.

## How it works

The repository contains an Electron desktop app and a local Node server. The app talks
to the server over HTTP on the loopback interface; the server runs the engines, stores
conversations and serves the UI in a browser when you run it standalone. Data lives in
`~/.openmausbot` (`OMB_DATA_DIR` overrides it).

Bots do not call a model API directly: each turn is handed to a supported CLI engine
(Claude Code, Codex, Gemini, OpenCode, Grok and other ACP-compatible agents, depending
on what is installed and signed in).

## Requirements

- Node.js 24 or newer, and pnpm.
- At least one supported engine CLI, installed and signed in on the machine that runs
  the bots.

## Run from source

```sh
pnpm install
pnpm dev:server   # API server on http://127.0.0.1:8799
pnpm dev          # UI dev server (Vite, prints its URL)
```

Other scripts:

```sh
pnpm typecheck    # client and server type checks
pnpm test         # vitest, broker, electron and packaged-server suites
pnpm build        # type check, build the server, build the UI
pnpm package      # build a desktop package for the current platform
```

## Repository layout

| Path | What it holds |
| --- | --- |
| `src/` | Renderer (React) UI |
| `server/` | Local API server, engines, storage, routes |
| `shared/` | Types shared by client and server |
| `electron/` | Desktop shell, packaging and native bridges |
| `docs/` | Self-hosting guide and verification recipes |

## Documentation

- [Self-hosting](docs/self-hosting.md)
- [Verification recipes](docs/verification/README.md)

## Licence

[Apache License 2.0](LICENSE) © 2026 Milind Soni and OpenMausBot contributors. See
[LICENSING.md](LICENSING.md).
