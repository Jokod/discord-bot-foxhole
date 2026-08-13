# Self-host

Guide to **run your own instance** of the Foxhole Discord bot (Discord + MongoDB).

Public instance / support: [discord.gg/bjkzG9YsX5](https://discord.gg/bjkzG9YsX5) · source: [GitHub](https://github.com/Jokod/discord-bot-foxhole).

| Topic | Link |
|-------|------|
| Docs index | [README.md](README.md) |
| Commands (usage) | [USAGE.md](USAGE.md) |
| Version migrations | [MIGRATION.md](MIGRATION.md) |
| Tests | [TESTING.md](TESTING.md) |
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

**Full package = [`compose.yaml`](../compose.yaml) + [`.env`](../.env.dist).**  
Use Compose if you want the bot, optional local MongoDB, and optional dashboard in one project. Pulling only the GHCR image is **not** enough for that stack.

Each git tag push builds and publishes **one app image** to GHCR: `ghcr.io/jokod/foxbot:<version>` (also `:latest`, `:<major>.<minor>`, `:<major>` on stable releases). Package must be **public**, or run `docker login ghcr.io` before pull.

| What you get | How |
|--------------|-----|
| Image alone (`docker pull ghcr.io/jokod/foxbot`) | FoxBot **code** only (bot + dashboard). **No** MongoDB. You must supply your own `MONGODB_URL`. |
| **[`compose.yaml`](../compose.yaml)** (recommended) | Orchestrates services: `discord-bot` always; `mongo` with profile `with-mongo`; `dashboard` with profile `dashboard`. Pulls `foxbot` from GHCR and `mongo:7` when needed. |

```bash
git clone https://github.com/Jokod/discord-bot-foxhole.git
cd discord-bot-foxhole
cp .env.dist .env
# edit .env — TOKEN, CLIENT_ID, OWNER, MONGODB_*
docker compose up -d
```

Pin a release: set `FOXBOT_IMAGE_TAG` in `.env` to a [published tag](https://github.com/Jokod/discord-bot-foxhole/pkgs/container/foxbot) (or leave unset for `latest`).  
Upgrade: bump the tag → `docker compose pull && docker compose up -d`.  
Local build: `docker compose up -d --build`.

#### MongoDB options

| Option | What to do |
|--------|------------|
| **Atlas / external Mongo** (recommended in prod) | Set `MONGODB_URL` / `MONGODB_NAME` in `.env`. `docker compose up -d` starts the bot only. |
| **Local Mongo via Compose** | Set `MONGO_ROOT_USERNAME` / `MONGO_ROOT_PASSWORD`, point `MONGODB_URL` at the `mongo` service, enable the profile (below). |

Local Mongo example in `.env`:

```bash
MONGO_ROOT_USERNAME=foxbot
MONGO_ROOT_PASSWORD=change-me
MONGODB_URL=mongodb://foxbot:change-me@mongo:27017/?authSource=admin
MONGODB_NAME=foxhole-bot
COMPOSE_PROFILES=with-mongo
```

Then: `docker compose up -d` (or `docker compose --profile with-mongo up -d`). Compose pulls **both** `ghcr.io/jokod/foxbot` and `mongo:7` (override with `MONGO_IMAGE`).

**CPU without AVX** (common on NAS / older Intel — `Illegal instruction` / “requires AVX”): official **MongoDB 5+ will not run**. Prefer **Atlas**. For local only, pin the last official image without AVX:

```bash
MONGO_IMAGE=mongo:4.4
```

Then recreate the volume (`docker compose down` → `docker volume rm foxbot-mongo-data` → `docker compose up -d`).
**Complete local stack** (bot + Mongo + dashboard on localhost):

```bash
COMPOSE_PROFILES=with-mongo,dashboard
```

Dashboard URL: http://127.0.0.1:3847 (or host LAN IP if published — see [Dashboard](#dashboard-stats-localhost)).

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
| `BLOCKED_GUILD_IDS` | no | Comma-separated guild IDs the bot must leave / refuse (env blocklist; not removable from the dashboard UI) |
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

Example **→ 1.0.0**: `node scripts/migrate-v2.js --dry-run` then `node scripts/migrate-v2.js`, then recreate boards with `/order` (no automatic `/logistics` / `/material` → order conversion).

Routine **1.0.x** patches: usually no Mongo script — deploy + restart (see [MIGRATION.md](MIGRATION.md#patch--minor-upgrades-10x)).

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
| Stats dashboard (local) | See [Dashboard](#dashboard-stats-localhost) |
| Dump MongoDB | `make mongo-dump` (`MONGO_ENV_FILE=.env.prod`; uses local `mongodump` or Docker `mongo:7`) |
| Restore dump | `make mongo-restore` (latest under `var/mongo-dump/`, or `MONGO_RESTORE_DIR=…`) |

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

## Dashboard (stats, localhost)

Small dashboard (KPIs, charts, guild list, Discord contacts, materials catalog) that reads **your** MongoDB.  
**By default Compose publishes port `3847` on the host** (all interfaces). For localhost-only, set `DASHBOARD_PUBLISH=127.0.0.1:3847`. Prefer a reverse proxy for HTTPS; do not expose the raw port on the public internet.

Protected by **login**. First seed creates `admin` / `admin` (`isDefault`). Data APIs stay locked until **you** change the password in **Profile** — the server never rotates credentials and never logs passwords. Stored hashed in MongoDB (`dashboard_auth`).

| | |
|--|--|
| Code | [`.dashboard/`](../.dashboard/) (`assets/` for CSS/JS) |
| URL | `http://127.0.0.1:3847` |
| Env | Same file as the bot (`TOKEN`, `MONGODB_*`) + optional `DASHBOARD_*` |
| Login | `admin` / `admin` until changed in Profile |

### Start

```bash
# Node / Makefile (default env file = .env.prod)
make dashboard-start DASHBOARD_ENV_FILE=.env

# or
DASHBOARD_ENV_FILE=.env npm run dashboard

# Docker (localhost only on the host)
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

Optional overrides: `DASHBOARD_PORT=3847`, `DASHBOARD_ENV_FILE=.env`, `DASHBOARD_HOST=127.0.0.1` (Compose sets `0.0.0.0` in the container and publishes `127.0.0.1:3847` on a **separate** Compose network from the bot). UI languages: **en / es / fr / ru / zh-CN** (same as the bot) — selector in the user menu.

### Reverse proxy (nginx, Caddy, Traefik, …)

The dashboard stays on **localhost** by default. Auth allows an optional reverse proxy to `127.0.0.1:3847` (do **not** publish the Docker port on `0.0.0.0`).

1. Start the dashboard (`docker compose --profile dashboard up -d` or `make dashboard-start`).
2. **From localhost**, sign in with `admin` / `admin` and **change the password in Profile** (unlocks data APIs) **before** opening any public proxy.
3. In `.env`:
   - `DASHBOARD_PUBLIC_ORIGIN=https://stats.your-domain` (required so CSRF Origin matches the public host; also enables `Secure` cookies when the URL is `https://…`)
   - `DASHBOARD_TRUST_PROXY=1` if the proxy sets `X-Forwarded-For` (login rate-limit uses the real client IP; `X-Forwarded-Host` is never trusted)
   - Optional: `DASHBOARD_COOKIE_SECURE=1` (redundant when `PUBLIC_ORIGIN` is `https://…`; use `=0` to force off)
4. Proxy `https://stats.your-domain` → `http://127.0.0.1:3847`.
5. Restart the dashboard so env changes apply, then open the public URL.

### Contents

- Overview: activity, joins/leaves, sizes, top commands / servers  
- Commands: global breakdown, filter to servers  
- Servers: search, filters, sort, detail drawer (language, faction, stats)  
- **Server admin actions** (drawer): leave, blacklist, unblacklist, broadcast — each with a short explanation and a confirmation modal (`CONFIRM` for leave / blacklist / unblacklist)  
- **Blacklisted servers**: list from Mongo `blocked_guilds` ∪ `BLOCKED_GUILD_IDS`; unblacklist only for Mongo (or `both`); env-only IDs stay until you edit the env  
- Contacts: Discord owners + creators of ops / stockpiles / boards (resolved via `TOKEN`)  
- **Materials**: full catalogue from `data/materials/` with search, category / subcategory / faction filters, grid or table view; icons served from `assets/icons/materials/` (emoji fallback)  
- Product: order boards, languages, factions, notifications, ops  

The Contacts tab calls the Discord API (`TOKEN`): owners of guilds **where the bot is still present**, and username resolution. `owner_id` is also stored on `Stats` at join / ready / leave so it remains after departure. Broadcast / leave / blacklist need a valid `TOKEN` as well (Discord REST).

### Security

- Login required (session cookie HttpOnly, SameSite=Strict). Default `admin` / `admin` — **you** must change it in Profile (min. 10 chars) before data APIs work. No automatic password rotation; passwords are never written to logs.
- Credentials stored in MongoDB collection `dashboard_auth` as **scrypt hash + salt** (never plaintext). Sessions are in-memory (container/process restart = re-login).
- Login rate-limited; CSRF requires `Origin` on POSTs (loopback exempt); sessions cleared on password change; CSP + security headers.
- Default bind **127.0.0.1** (`DASHBOARD_HOST`). Docker publishes `127.0.0.1:3847` on the host only and isolates the dashboard Compose network from the bot — use a reverse proxy for remote access.
- Behind HTTPS: `DASHBOARD_PUBLIC_ORIGIN=https://…` (Secure cookie auto) and usually `DASHBOARD_TRUST_PROXY=1`.
- Same secrets as the bot: do not commit `.env` / `.env.*` (except `.env.dist`).

---

## Wiki sync (materials)

JSON under `data/materials/` feeds **Add** on `/order` boards. Item icons for the dashboard live under `assets/icons/materials/` (committed PNGs + `manifest.json`). The dashboard does **not** call the wiki at runtime — refresh icons with the sync script and commit the files.

| npm script | Effect |
|------------|--------|
| `npm run wiki:sync-materials` | Update descriptions / factions for existing entries |
| `npm run wiki:sync-materials:dry` | Dry-run |
| `npm run wiki:sync-materials:add-missing` | Import missing wiki pages |
| `npm run wiki:sync-materials:add-missing:and-sync` | Import + full sync |
| `npm run wiki:sync-icons` | Download item icons from wiki into `assets/icons/materials/` |
| `npm run wiki:sync-icons:dry` | Dry-run icon sync |
| `npm run wiki:sync-icons:force` | Re-download all icons |

Icon downloads are maintainer-only (not used by the dashboard at runtime). The sync script only accepts `https://foxhole.wiki.gg/images/…`, checks raster magic bytes (PNG/JPEG/GIF/WebP), caps size (~512 KiB), and rejects path traversal in filenames. Served icons are static files under `assets/icons/materials/` with CSP `img-src 'self'`.

Source: [foxhole.wiki.gg](https://foxhole.wiki.gg). Prefer the script / routing under `scripts/lib/wiki-sync/` over large manual edits.

---

## Tests (before deploy)

```bash
npm test
npm run test:ci      # lint + i18n + coverage (same as CI)
npm run i18n:check
```

CI: [`.github/workflows/integration.yaml`](../.github/workflows/integration.yaml).  
Docker image on tag: [`.github/workflows/docker.yaml`](../.github/workflows/docker.yaml) runs the same quality gates first, then builds/pushes `ghcr.io/jokod/foxbot`.

---

## Quick troubleshooting

| Problem | Hint |
|---------|------|
| Missing / stale slash commands | Restart in `prod`; wait a few minutes; check invite scopes |
| Bot silent | Token, intents, channel permissions, `/setup` done |
| Mongo error | `MONGODB_URL` / `MONGODB_NAME`, Atlas network |
| Missing Logs threads | `logs:true` + thread permissions |
| Empty `/about` | Set `GITHUB_URL` / `DISCORD_INVITE_URL` |
| Dashboard won’t start | Check `DASHBOARD_ENV_FILE` (often `.env`), `MONGODB_*` / `TOKEN`; logs: `make dashboard-logs` |
| Can’t unlock stats | Still on default password — change it in Profile (min. 10 chars) |
| Contacts without usernames | Invalid or expired `TOKEN` in the dashboard env file |

Community support (not your clan prod): [discord.gg/bjkzG9YsX5](https://discord.gg/bjkzG9YsX5).
