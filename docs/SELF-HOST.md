# Self-host

Guide to **run your own instance** of the Foxhole Discord bot (Discord + MongoDB).

Public instance / support: [discord.gg/bjkzG9YsX5](https://discord.gg/bjkzG9YsX5) · source: [GitHub](https://github.com/Jokod/discord-bot-foxhole).

| Topic | Link |
|-------|------|
| Docs index | [README.md](README.md) |
| Commands (usage) | [USAGE.md](USAGE.md) |
| Version migrations | [MIGRATION.md](MIGRATION.md) |
| Tests | [TESTING.md](TESTING.md) |
| Release notes | [CHANGELOG.md](../CHANGELOG.md) |
| Privacy | [PRIVACY_POLICY.md](../PRIVACY_POLICY.md) |
| Contributing | [CONTRIBUTING.md](../CONTRIBUTING.md) |

---

## Prerequisites

- **Node.js ≥ 20** (LTS) — see `.nvmrc` *(not required if you use Docker)*
- **MongoDB** (local or Atlas)
- A Discord bot application ([Developer Portal](https://discord.com/developers/applications)) with a token
- Optional: **Docker** + Compose for the published image

---

## Installation

### Docker (recommended for self-host)

Each git tag push builds and publishes to GHCR: `ghcr.io/jokod/foxbot:<version>` (also `:latest`, `:<major>.<minor>`, `:<major>` on stable releases). Package must be **public**, or run `docker login ghcr.io` before pull.

Compose: [`compose.yaml`](../compose.yaml).

```bash
git clone https://github.com/Jokod/discord-bot-foxhole.git
cd discord-bot-foxhole
cp .env.dist .env
# edit .env — at least TOKEN, CLIENT_ID, OWNER, MONGODB_URL, MONGODB_NAME
docker compose up -d
```

Pin a release: `FOXBOT_IMAGE_TAG=1.0.0` in `.env`.  
Upgrade: bump the tag → `docker compose pull && docker compose up -d`.  
Local build: `docker compose up -d --build`.

Optional Mongo (dev): set `MONGO_ROOT_*`, `MONGODB_URL=mongodb://USER:PASS@mongo:27017/?authSource=admin`, then `docker compose --profile with-mongo up -d`.  
Dashboard (localhost only): `docker compose --profile dashboard up -d` → http://127.0.0.1:3847

### From source (Node)

```bash
git clone https://github.com/Jokod/discord-bot-foxhole.git
cd discord-bot-foxhole
npm install
cp .env.dist .env
```

Edit `.env` (see [Environment variables](#environment-variables)), then:

```bash
npm run start    # production
npm run dev      # development (nodemon)
```

### Discord invite

Scopes: **`bot`** + **`applications.commands`**.

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=328565001280&scope=bot%20applications.commands
```

Included permissions (among others): manage messages/channels used by boards, **Create Public Threads** + **Send Messages in Threads** (order Logs threads).

After invite: run **`/setup`** once (language + faction; optional `logs`, default **false**).

---

## Environment variables

Reference: [`.env.dist`](../.env.dist).

| Variable | Required | Role |
|----------|----------|------|
| `TOKEN` | yes | Discord bot token |
| `CLIENT_ID` | yes | Application ID |
| `MONGODB_URL` | yes | Mongo URI |
| `MONGODB_NAME` | yes | Database name |
| `OWNER` | yes | Discord owner user ID (`!reload`, etc.) |
| `TEST_GUILD_ID` | recommended in `dev` | Test guild |
| `APP_ENV` | yes | `dev` or `prod` |
| `PREFIX` | no | Text command prefix (default `!`) |
| `TZ` | no | Timezone (e.g. `Europe/Paris`) |
| `BLOCKED_GUILD_IDS` | no | Comma-separated guild IDs to leave |
| `GITHUB_URL` | no | Shown in `/about` |
| `GITHUB_ISSUES_URL` | no | Issues link override (default `GITHUB_URL/issues/new`) |
| `DISCORD_INVITE_URL` | no | Support invite + Follow Announcements text in `/about` |

### `APP_ENV`

| Value | Slash behaviour |
|-------|-----------------|
| `prod` | **Global** command registration at startup |
| `dev` | **Guild** registration (`TEST_GUILD_ID`) — faster iteration |

In `dev`, old **global** commands may still appear: clear them in the Developer Portal or wait for propagation.

---

## Data and responsibility

- All data stays in **your** MongoDB (plus optional host log files under `var/logs/`).
- On guild leave / blocklist / orphan at boot: cleanup deletes that guild’s boards, lines, ops, notifications, tracked messages, stockpiles, and `Server` config; `Stats.left_at` is set. Statistics may include the server owner Discord ID.
- The bot does not archive general chat; see [PRIVACY_POLICY.md](../PRIVACY_POLICY.md).

---

## Migration / upgrade

Before any major version bump:

1. **Backup** MongoDB  
2. Follow **[MIGRATION.md](MIGRATION.md)** (scripts, collections, checklist)  
3. Deploy code → **restart**  
4. Check slash commands (re-registered at boot)

Example **→ 1.0.0**: `node scripts/migrate-v2.js --dry-run` then `node scripts/migrate-v2.js`, then recreate boards with `/order` (no automatic logistics/stock → order conversion).

---

## Day-to-day operations

| Action | Command / note |
|--------|----------------|
| Start (Node) | `npm run start` |
| Start (Docker) | `make docker-up` (or `docker compose up -d`) |
| Dashboard (Docker) | `make docker-dashboard` → http://127.0.0.1:3847 |
| Restart | Restart the process / container → resync open boards + stockpile lists + slash |
| Logs (Docker) | `make docker-logs` |
| New war (wipe game data) | `/server reset confirm:true` (Manage Server) — preview with `confirm:false` |
| Order Logs threads | `/setup logs` or `/server logs` |
| Owner | `!reload <command>` |
| Stats dashboard (local) | See [Dashboard](#dashboard-stats-local) |

### GitHub releases → Discord (optional)

To post **releases** in an Announcements channel: Discord webhook + **`/github`** URL suffix, GitHub **Releases** event. In an Announcements channel, **Publish** the message so servers that **Follow** receive it.

### One-shot announce to all guilds (optional)

Maintainer script (not run by CI or the dashboard):

```bash
DASHBOARD_ENV_FILE=.env.prod node scripts/announce-guilds.js --dry-run
DASHBOARD_ENV_FILE=.env.prod node scripts/announce-guilds.js --send
```

Message body: `data/announce.md` (or `--message-file=…`). Writes a per-guild summary to `data/announce-last-run.txt`. Exit code `1` if any guild failed.

---

## Dashboard (local stats)

Small **local** dashboard (KPIs, charts, guild list, Discord contacts) that reads **your** MongoDB. For self-host ops — **not** publicly exposed.

| | |
|--|--|
| Code | [`.dashboard/`](../.dashboard/) (`assets/` for CSS/JS) |
| URL | `http://127.0.0.1:3847` (**localhost only**) |
| Env | Same file as the bot (`TOKEN`, `MONGODB_*`) |

### Start

```bash
# Node / Makefile (default env file = .env.prod)
make dashboard-start DASHBOARD_ENV_FILE=.env

# or
DASHBOARD_ENV_FILE=.env npm run dashboard

# Docker (localhost only)
docker compose --profile dashboard up -d
```

| Make target | Effect |
|-------------|--------|
| `make dashboard-start` | Start in background |
| `make dashboard-stop` | Stop |
| `make dashboard-restart` | Restart |
| `make dashboard-status` | Status / pid |
| `make dashboard-open` | Open browser |
| `make dashboard-logs` | Tail logs |

Optional overrides: `DASHBOARD_PORT=3847`, `DASHBOARD_ENV_FILE=.env`, `DASHBOARD_HOST=127.0.0.1` (Compose sets `0.0.0.0` in the container and publishes `127.0.0.1:3847`).

### Contents

- Overview: activity, joins/leaves, sizes, top commands / servers  
- Commands: global breakdown, filter to servers  
- Servers: search, filters, sort, detail (language, faction, stats)  
- Contacts: Discord owners + creators of ops / stockpiles / boards (resolved via `TOKEN`)  
- Product: order boards, languages, factions, notifications, ops  

The Contacts tab calls the Discord API (`TOKEN`): owners of guilds **where the bot is still present**, and username resolution. `owner_id` is also stored on `Stats` at join / ready / leave so it remains after departure.

### Security

- Default bind **127.0.0.1** (`DASHBOARD_HOST`) — do not reverse-proxy without auth.  
- Docker: listens on `0.0.0.0` *inside* the container, port published as `127.0.0.1:3847` on the host only.  
- Same secrets as the bot: do not commit `.env` / `.env.*` (except `.env.dist`).

---

## Wiki sync (materials)

JSON under `data/materials/` feeds **Add** on `/order` boards.

| npm script | Effect |
|------------|--------|
| `npm run wiki:sync-materials` | Update descriptions / factions for existing entries |
| `npm run wiki:sync-materials:dry` | Dry-run |
| `npm run wiki:sync-materials:add-missing` | Import missing wiki pages |
| `npm run wiki:sync-materials:add-missing:and-sync` | Import + full sync |

Source: [foxhole.wiki.gg](https://foxhole.wiki.gg). Prefer the script / routing under `scripts/lib/wiki-sync/` over large manual edits.

---

## Tests (before deploy)

```bash
npm test
npm run test:ci      # lint + i18n + coverage (same as CI)
npm run i18n:check
```

CI: [`.github/workflows/integration.yaml`](../.github/workflows/integration.yaml).  
Docker image on tag: [`.github/workflows/docker.yaml`](../.github/workflows/docker.yaml) → `ghcr.io/jokod/foxbot`.

---

## Quick troubleshooting

| Problem | Hint |
|---------|------|
| Missing / stale slash commands | Restart in `prod`; wait a few minutes; check invite scopes |
| Bot silent | Token, intents, channel permissions, `/setup` done |
| Mongo error | `MONGODB_URL` / `MONGODB_NAME`, Atlas network |
| Missing Logs threads | `logs:true` + thread permissions |
| Empty `/about` | Set `GITHUB_URL` / `DISCORD_INVITE_URL` |
| Dashboard won’t start | Check `DASHBOARD_ENV_FILE` (often `.env`), `TOKEN` / Mongo; logs: `make dashboard-logs` |
| Contacts without usernames | Invalid or expired `TOKEN` in the dashboard env file |

Community support (not your clan prod): [discord.gg/bjkzG9YsX5](https://discord.gg/bjkzG9YsX5).
