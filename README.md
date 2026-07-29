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

**Support Discord:** [discord.gg/bjkzG9YsX5](https://discord.gg/bjkzG9YsX5) · **Source:** [GitHub](https://github.com/Jokod/discord-bot-foxhole)

## Table of Contents

- [Features](#features)
- [Configuration](#configuration)
- [Data collected](#data-collected)
- [Installation](#installation)
- [Upgrading to 1.0.0](#upgrading-to-100-self-host)
- [Usage](#usage)
- [Wiki sync (materials)](#wiki-sync-materials)
- [Testing](#testing)
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

## Data collected

When installed on a server, the bot stores **usage statistics** and **functional data** in MongoDB. Details: [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

### Per-server statistics (Stats)

| Data | Description |
|------|-------------|
| Server ID / name / creation date | Guild identity |
| Bot join / leave dates | Lifecycle |
| Command counts & last use | Slash usage analytics |
| Member count | Updated on command use |
| Operations created | Via `/operation` |
| Materials / order-related counters | Historical + order activity fields |

Self-host: data stays in **your** database.

### Automatic server data cleanup

Triggered when the bot leaves a guild, is blocked (`BLOCKED_GUILD_IDS`), or is missing at startup.

Collections cleaned for that guild include: `OrderLine`, `OrderBoard`, `Operation`, `NotificationSubscription`, `TrackedMessage`, `Stockpile`, `Server`.  
`Stats.left_at` is set for analytics.

## Installation

### Prerequisites

- Node.js **v16.11+** (v20.x recommended)
- MongoDB (local or Atlas)
- Discord bot token ([Developer Portal](https://discord.com/developers/applications))

### Setup

1. Clone and install:
   ```bash
   git clone https://github.com/Jokod/discord-bot-foxhole.git
   cd discord-bot-foxhole
   npm install
   ```

2. Configure env:
   ```bash
   cp .env.dist .env
   ```
   Fill in: `TOKEN`, `CLIENT_ID`, `MONGODB_URL`, `MONGODB_NAME`, `OWNER`, `TEST_GUILD_ID`, `APP_ENV` (`dev` / `prod`).  
   Optional: `BLOCKED_GUILD_IDS` (comma-separated guild IDs the bot must leave).

3. Invite with scopes **`bot`** + **`applications.commands`**:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=328565001280&scope=bot%20applications.commands
   ```

4. Start:
   ```bash
   npm run start    # production
   npm run dev      # development (nodemon)
   ```

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues.  
Release notes: [CHANGELOG.md](CHANGELOG.md).

## Upgrading to 1.0.0 (self-host)

If you already run a **pre-1.0.0** instance (logistics threads and/or `/stock` inventory):

1. **Backup** MongoDB.
2. Run **`node scripts/migrate-v2.js --dry-run`**, then **`node scripts/migrate-v2.js`**.
3. Deploy **1.0.0** code and **restart** the bot.
4. On each Discord server: delete leftover inventory/logistics messages if any, recreate needed boards with **`/order create`**.
5. **Re-register slash commands** so Discord drops obsolete commands and picks up `/order`, `/server reset`, etc. Restart the bot (global registration runs at boot). If an old command still appears, wait a few minutes or kick/re-invite the bot with the `applications.commands` scope.

There is **no** automatic conversion of old inventory/logistics into order boards.

Full guide (collections touched, smoke checklist): **[docs/MIGRATION_V2.md](docs/MIGRATION_V2.md)**.

## Usage

After `/setup`, use slash commands below. Localized names appear according to server language (e.g. FR: `/commande`, `/depot`).

### Commands overview

#### General

- `/help [command]` — List commands or detail one command.
- `/about` — GitHub + support Discord invite (ephemeral; FR `/a-propos`).

#### Server

- `/setup lang:<en|fr|ru|zh-CN> camp:<warden|colonial> [logs:<true|false>]` — First-time init (`logs` default **false**).
- `/server infos` — Show config.
- `/server lang` / `/server camp` / `/server logs enabled:<true|false>` — Update config (`logs:false` deletes existing order Logs threads).
- `/server reset confirm:false` — Preview counts (boards / stockpiles / operations) without deleting.
- `/server reset confirm:true` — Wipe order boards, stockpiles and operations for a **new war** (Manage Server). Keeps language/camp/logs config and notifications. Also deletes operation Discord messages when `channel_id` is known.

#### War (live API)

- `/war status` | `maps` | `report map:<MapName>`

#### Operations

- `/operation title:<TITLE>` — Modal (date, time, duration, description) → Start / Cancel / Finished.

#### Orders (production / front transfer / scrap)

Not a Foxhole inventory. Counts **progress on a short order** (OP, haul, or farm run).

- `/order create type:prod|transfer|scrap name:<Name> [operation:<…>]` — Create board in this channel (FR: `/commande`). Link an **active** operation via autocomplete. Creates a locked **Logs** thread if enabled in setup/server.
- `/order remove name:<Name>` — Delete board + Discord message + log thread if any (autocomplete; owner or Manage Guild/Channels).

**On the board:** Select a line · **-1 / +1 / +4 / +9 / Max** · Priority · Add · Correct · Delete · Close / Reopen.  
Up to **50 lines** (Discord: **2** selects × 25). At capacity the embed turns **red**, **Add** is disabled, and further adds are rejected. Long lists may truncate in the embed (use the selects).

**Permissions**
| Who | Actions |
|-----|---------|
| Everyone | Create board, select line, ±qty / Max, Add, Correct, Priority |
| Line/board owner **or** Manage Guild / Manage Channels | Delete, Close / Reopen, `/order remove` |

**Closed boards** stay read-only until an owner/moderator clicks **Reopen** (synced on bot startup too).

**Logs thread:** optional (enable with `/setup logs:true` or `/server logs`). Locked (read-only for members; bot posts qty / max / priority / add / correct / close / reopen / delete). Not attached to the board message. Board remove always deletes the thread if it exists.

Bot needs **Create Public Threads** + **Send Messages in Threads** (included in the invite link permissions above).

#### Stockpiles (depot codes)

- `/stockpile add` — Modal (region, city, name, 6-digit code).
- `/stockpile list` — Tracked list (reset timers, soft-delete, admin cleanup / delete all).

#### Notifications

Requires **Manage Channels** for on/off.

- `/notify on|off type:<Type>` | `/notify list`

| Type | When |
|------|------|
| Stockpile activity | On add / remove / reset |
| Stockpile expiring soon | Startup + every 5 min (12h / 6h / 1h / 30m) |

#### Newsletter

Requires **Manage Server**. `/newsletter subscribe` | `unsubscribe`. Publish: `make newsletter publish`.

## Project Structure

### Materials catalog (for order “Add”)

Catalog JSON under `data/materials/` (utilities, infantry_weapons, ammunition, resources, vehicles). Used when adding lines to an order board — kept in sync with the wiki (see below).

## Wiki sync (materials)

Self-host maintainers refresh `data/materials/` from [foxhole.wiki.gg](https://foxhole.wiki.gg) via `scripts/sync-wiki-materials.js`. Prefer script/config changes over hand-editing JSON.

| Command | What it does |
|--------|----------------|
| `npm run wiki:sync-materials` | Update all existing rows (desc + faction) |
| `npm run wiki:sync-materials:dry` | Dry run |
| `npm run wiki:sync-materials:add-missing` | Import missing wiki pages |
| `npm run wiki:sync-materials:add-missing:and-sync` | Add missing + full sync |

See script header and `scripts/lib/wiki-sync/` for flags and routing.

## Testing

```bash
npm test
npm run test:watch
npm run test:coverage
npm run test:ci          # lint + i18n parity + coverage (same gates as GitHub Actions)
npm run i18n:check       # en/fr/ru/zh-cn key parity + ORDER_* presence
```

CI (`.github/workflows/integration.yaml`) runs lint, i18n parity, then the full Jest suite with coverage thresholds (order, migrate-v2, etc.). New tests under `__tests__/` are picked up automatically — no workflow edit needed.

More: [TESTING.md](TESTING.md) · smoke checklist in [docs/MIGRATION_V2.md](docs/MIGRATION_V2.md).

## Contribute

Questions / help: [FoxBot Discord](https://discord.gg/bjkzG9YsX5).

1. Fork the repo.  
2. Branch: `git checkout -b my-contribution`.  
3. Change, test (`npm test`), open a PR to `main`.

## License

[MIT License](LICENSE).
