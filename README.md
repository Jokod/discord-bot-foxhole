# Discord Bot for Foxhole

[![CI](https://img.shields.io/github/actions/workflow/status/Jokod/discord-bot-foxhole/integration.yaml?branch=main&label=CI)](https://github.com/Jokod/discord-bot-foxhole/actions/workflows/integration.yaml)
[![Coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FJokod%2Fdiscord-bot-foxhole%2Fmain%2Fbadges%2Fcoverage.json)](docs/TESTING.md)
[![GHCR](https://img.shields.io/badge/ghcr.io-jokod%2Ffoxbot-blue?logo=docker&label=image)](https://github.com/Jokod/discord-bot-foxhole/pkgs/container/foxbot)
[![Version](https://img.shields.io/github/package-json/v/Jokod/discord-bot-foxhole?label=version)](https://github.com/Jokod/discord-bot-foxhole)
[![License](https://img.shields.io/github/license/Jokod/discord-bot-foxhole)](LICENSE)
[![Node](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FJokod%2Fdiscord-bot-foxhole%2Fmain%2Fpackage.json&query=%24.engines.node&label=node&color=brightgreen)](https://nodejs.org/)
[![discord.js](https://img.shields.io/github/package-json/dependency-version/Jokod/discord-bot-foxhole/discord.js)](https://discord.js.org/)
[![mongoose](https://img.shields.io/github/package-json/dependency-version/Jokod/discord-bot-foxhole/mongoose)](https://mongoosejs.com/)
[![Last commit](https://img.shields.io/github/last-commit/Jokod/discord-bot-foxhole)](https://github.com/Jokod/discord-bot-foxhole/commits)

Open-source Discord bot for **Foxhole** operations and logistics coordination.  
Focus: **order boards** (production, front transfer, scrap/farm), operations, and stockpile **codes** — not a live in-game inventory mirror.

**Support Discord:** [discord.gg/bjkzG9YsX5](https://discord.gg/bjkzG9YsX5) · **Source:** [GitHub](https://github.com/Jokod/discord-bot-foxhole) · **Docs:** [docs/](docs/README.md)

## Get updates on your server

FoxBot publishes news and release notes in the **Announcements** channel on the [support Discord](https://discord.gg/bjkzG9YsX5). Server admins can **Follow** that channel so posts appear in a channel of **their own** Discord (native Discord feature — no bot command).

1. Join [discord.gg/bjkzG9YsX5](https://discord.gg/bjkzG9YsX5)  
2. Open **Announcements**  
3. Click **Follow** (needs **Manage Webhooks** on your server)  
4. Choose the target channel  

Also explained in **`/about`**.

## Table of Contents

- [Get updates on your server](#get-updates-on-your-server)
- [Features](#features)
- [Configuration](#configuration)
- [Data collected](#data-collected)
- [Documentation](#documentation)
- [Contribute](#contribute)
- [License](#license)

## Features

- **Operations** — Create and track ops (`/operation`: pending → started → finished).
- **Order boards** — Per-channel **production**, **front transfer**, or **scrap/farm** boards (`/order`):
  - Lines = item + **priority** + `Stock: current/target` + **urgency**
  - Select a line, then **-1 / +1 / +4 / +9 / Max**
  - Add from catalog · Correct · Close · Priority cycle
  - Optional locked **Logs** thread (read-only; off by default)
  - Optional link to an operation  
  - **Not** a Foxhole stockpile inventory (front stock is read in-game).
- **Stockpile codes** — Share depot codes with region/city grouping and expiry timers (`/stockpile`).
- **War API** — Live war status / maps / reports (`/war`).
- **Notifications** — Stockpile activity & expiry reminders (`/notify`).
- **Languages** — English, French, Russian, Chinese (Simplified).

## Configuration

1. Invite the bot: [Add to my Discord server](https://discord.com/api/oauth2/authorize?client_id=1149421904428544081&permissions=328565001280&scope=applications.commands%20bot).
2. Grant command permissions as needed for your roles.
3. Run **`/setup`** once (language + faction: colonial / warden ; optional **`logs`** for order Logs threads, default off).
4. **Recommended:** [Follow Announcements](#get-updates-on-your-server) so FoxBot news lands in your Discord.

Command reference: **[docs/USAGE.md](docs/USAGE.md)**.

## Data collected

The bot stores **functional data** (setup, operations, order boards, stockpile codes, notifications, tracked message IDs) and **usage statistics** (including guild and server-owner Discord IDs) in MongoDB. It does not archive general chat; it may read message content only when syncing its own tracked messages and writing host interaction logs. Full detail: [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

Self-host: data stays in **your** database — see [docs/SELF-HOST.md](docs/SELF-HOST.md) (Node or **Docker** / `ghcr.io/jokod/foxbot`).

When the bot leaves a guild, is blocked (`BLOCKED_GUILD_IDS`), or is missing at startup: that guild’s `OrderLine`, `OrderBoard`, `Operation`, `NotificationSubscription`, `TrackedMessage`, `Stockpile`, and `Server` rows are deleted; `Stats.left_at` is set for analytics.

## Documentation

| Doc | For |
|-----|-----|
| [docs/USAGE.md](docs/USAGE.md) | Slash commands & boards |
| [docs/SELF-HOST.md](docs/SELF-HOST.md) | Install, env, ops, wiki sync, dashboard (localhost by default) |
| [docs/MIGRATION.md](docs/MIGRATION.md) | Version upgrades |
| [docs/TESTING.md](docs/TESTING.md) | Tests & CI |
| [docs/README.md](docs/README.md) | Full docs index |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributors |

## Contribute

Questions / help: [FoxBot Discord](https://discord.gg/bjkzG9YsX5).

1. Fork the repo.  
2. Branch: `git checkout -b my-contribution`.  
3. Change, test (`npm test`), open a PR to `main`.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT License](LICENSE).
