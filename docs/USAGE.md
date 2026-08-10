# Usage

Slash commands and board behaviour after **`/setup`**. Discord may show localized command names depending on client language; this doc uses the English names.

Hosted invite: use the [Add to Discord](https://discord.com/api/oauth2/authorize?client_id=1149421904428544081&permissions=328565001280&scope=applications.commands%20bot) link from the README. Self-host: [SELF-HOST.md](SELF-HOST.md).

---

## Follow Announcements (recommended)

Receive FoxBot **news and release notes in your own Discord** via Discord’s native **Follow** (independent of the bot).

1. Join the [support Discord](https://discord.gg/bjkzG9YsX5)  
2. Open the **Announcements** channel  
3. Click **Follow** (you need **Manage Webhooks** on your server)  
4. Pick a channel on your server  

Same steps in **`/about`**.

---

## General

- `/help [command]` — List commands or detail one command.
- `/about` — Support Discord + **Follow Announcements** steps, GitHub, issues (ephemeral).

## Server

- `/setup lang:<en|fr|ru|zh-CN> camp:<warden|colonial> [logs:<true|false>]` — First-time init (`logs` default **false**).
- `/server infos` — Show config.
- `/server lang` / `/server camp` / `/server logs enabled:<true|false>` — Update config (`logs:false` deletes existing order Logs threads).
- `/server reset confirm:false` — Preview counts (boards / stockpiles / operations) without deleting.
- `/server reset confirm:true` — Wipe order boards, stockpiles and operations for a **new war** (Manage Server). Keeps language/camp/logs config and notifications. Also deletes operation Discord messages when `channel_id` is known.

## War (live API)

- `/war status` | `maps` | `report map:<MapName>`

## Operations

- `/operation title:<TITLE>` — Modal (date, time, duration, description) → Start / Cancel / Finished.

## Orders (production / front transfer / scrap)

Not a Foxhole inventory. Counts **progress on a short order** (OP, haul, or farm run).

- `/order create type:prod|transfer|scrap name:<Name> [operation:<…>]` — Create board in this channel. Link an **active** operation via autocomplete. Creates a locked **Logs** thread if enabled in setup/server.
- `/order remove name:<Name>` — Delete board + Discord message + log thread if any (autocomplete; owner or Manage Guild/Channels).

**On the board:** Select a line · **-1 / +1 / +4 / +9 / Max** · Priority · Add · Correct · Delete · Close / Reopen.  
Up to **50 lines** (Discord: **2** selects × 25). At capacity the embed turns **red**, **Add** is disabled, and further adds are rejected. Long lists may truncate in the embed (use the selects).

**Permissions**

| Who | Actions |
|-----|---------|
| Everyone | Create board, select line, ±qty / Max, Add, Correct, Priority |
| Line/board owner **or** Manage Guild / Manage Channels | Delete, Close / Reopen, `/order remove` |

**Closed boards** stay read-only until an owner/moderator clicks **Reopen** (synced on bot startup too).

**Logs thread:** optional (`/setup logs:true` or `/server logs`). Locked (read-only for members; bot posts qty / max / priority / add / correct / close / reopen / delete). Not attached to the board message. Board remove always deletes the thread if it exists.

Bot needs **Create Public Threads** + **Send Messages in Threads**.

## Stockpiles (depot codes)

Soft-delete marks a depot with ❌ on the list; it stays until **Cleanup** or expiry purge.

- `/stockpile add` — Modal (region, city, name, 6-digit code).
- `/stockpile list` — Public tracked list + **reset** timer buttons only.
- `/stockpile manage` — Ephemeral panel (stockpile creator **or** Manage Guild / Manage Channels):
  - Select — mark a depot as deleted (creator of that depot, or Manage Guild / Manage Channels)
  - **Cleanup** — permanently delete depots already marked as deleted
  - **Delete all** — wipe every depot on the server (Manage Guild / Manage Channels only)

| Who | Actions |
|-----|---------|
| Everyone | `/stockpile add`, `/stockpile list`, reset timers on the list |
| Depot creator **or** Manage Guild / Manage Channels | `/stockpile manage`, mark own (or any with manage) depot deleted |
| Manage Guild / Manage Channels | Cleanup, Delete all |

## Notifications

Requires **Manage Channels** for on/off.

- `/notify on|off type:<Type>` | `/notify list`

| Type | When |
|------|------|
| Stockpile activity | On add / remove / reset |
| Stockpile expiring soon | Startup + every 5 min (12h / 6h / 1h / 30m) |
