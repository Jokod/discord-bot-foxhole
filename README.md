# Discord Bot for Foxhole

[![CI](https://img.shields.io/github/actions/workflow/status/Jokod/discord-bot-foxhole/integration.yaml?branch=main&label=CI)](https://github.com/Jokod/discord-bot-foxhole/actions/workflows/integration.yaml)
[![Version](https://img.shields.io/github/package-json/v/Jokod/discord-bot-foxhole?label=version)](CHANGELOG.md)
[![License](https://img.shields.io/github/license/Jokod/discord-bot-foxhole)](LICENSE)
[![Node](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FJokod%2Fdiscord-bot-foxhole%2Fmain%2Fpackage.json&query=%24.engines.node&label=node&color=brightgreen)](https://nodejs.org/)
[![discord.js](https://img.shields.io/github/package-json/dependency-version/Jokod/discord-bot-foxhole/discord.js)](https://discord.js.org/)
[![mongoose](https://img.shields.io/github/package-json/dependency-version/Jokod/discord-bot-foxhole/mongoose)](https://mongoosejs.com/)
[![Last commit](https://img.shields.io/github/last-commit/Jokod/discord-bot-foxhole)](https://github.com/Jokod/discord-bot-foxhole/commits)

Open-source Discord bot for **Foxhole** operations and logistics coordination.  
Focus: **order boards** (production, front transfer, scrap/farm), operations, and stockpile **codes** — not a live in-game inventory mirror.

**Support Discord:** [discord.gg/bjkzG9YsX5](https://discord.gg/bjkzG9YsX5) · **Source:** [GitHub](https://github.com/Jokod/discord-bot-foxhole) · **Docs:** [docs/](docs/README.md)

## Table of Contents

- [Features](#features)
- [Configuration](#configuration)
- [Data collected](#data-collected)
- [Documentation](#documentation)
- [Contribute](#contribute)
- [License](#license)

## Features

- **Operations** — Create and track ops (`/operation`: pending → started → finished).
- **Order boards** — Per-channel **production**, **front transfer**, or **scrap/farm** boards (`/order`, FR **`/commande`**):
  - Lines = item + **priority** + `Stock: current/target` + **urgency**
  - Select a line, then **-1 / +1 / +4 / +9 / Max**
  - Add from catalog · Correct · Close · Priority cycle
  - Locked **Logs** thread (read-only)
  - Optional link to an operation  
  - **Not** a Foxhole stockpile inventory (front stock is read in-game).
- **Stockpile codes** — Share depot codes with region/city grouping and expiry timers (`/stockpile`, FR **`depot`**).
- **War API** — Live war status / maps / reports (`/war`).
- **Notifications** — Stockpile activity & expiry reminders (`/notify`).
- **Languages** — English, French, Russian, Chinese (Simplified).

## Configuration

1. Invite the bot: [Add to my Discord server](https://discord.com/api/oauth2/authorize?client_id=1149421904428544081&permissions=328565001280&scope=applications.commands%20bot).
2. Grant command permissions as needed for your roles.
3. Run **`/setup`** once (language + faction: colonial / warden ; optional **`logs`** for order Logs threads, default off).

Command reference: **[docs/USAGE.md](docs/USAGE.md)**.

## Data collected

When installed on a server, the bot stores **usage statistics** and **functional data** in MongoDB. Details: [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

Self-host: data stays in **your** database — see [docs/SELF-HOST.md](docs/SELF-HOST.md).

Triggered when the bot leaves a guild, is blocked (`BLOCKED_GUILD_IDS`), or is missing at startup: cleanup of that guild’s `OrderLine`, `OrderBoard`, `Operation`, `NotificationSubscription`, `TrackedMessage`, `Stockpile`, `Server` ; `Stats.left_at` is set for analytics.

## Documentation

| Doc | For |
|-----|-----|
| [docs/USAGE.md](docs/USAGE.md) | Slash commands & boards |
| [docs/SELF-HOST.md](docs/SELF-HOST.md) | Install, env, ops, wiki sync, dashboard local |
| [docs/MIGRATION.md](docs/MIGRATION.md) | Version upgrades |
| [docs/TESTING.md](docs/TESTING.md) | Tests & CI |
| [docs/README.md](docs/README.md) | Full docs index |
| [CHANGELOG.md](CHANGELOG.md) | Release notes |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributors |

## Contribute

Questions / help: [FoxBot Discord](https://discord.gg/bjkzG9YsX5).

1. Fork the repo.  
2. Branch: `git checkout -b my-contribution`.  
3. Change, test (`npm test`), open a PR to `main`.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT License](LICENSE).
