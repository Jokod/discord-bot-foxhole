# Privacy Policy

**Last updated: July 29, 2026**

This Privacy Policy describes what data the Discord Bot for Foxhole ("the Bot") collects, why, and how it is stored. By adding the Bot to your Discord server, you acknowledge this policy.

The hosted public instance is operated by the project maintainer. If you self-host the Bot, you are responsible for your own data handling; this policy describes the software’s behaviour and applies to the hosted instance.

---

## 1. What the Bot stores

The Bot stores data needed to run its features. Data lives in **MongoDB** on the host, unless noted otherwise.

### 1.1 Server configuration

When an admin runs `/setup` (or updates via `/server`):

| Data | Purpose |
|------|---------|
| Discord guild ID | Identify the server |
| Language | Localize bot replies |
| Faction (warden / colonial) | Filter faction-specific catalog items |
| Order Logs flag | Whether locked Logs threads are created for order boards |

### 1.2 Operations

When someone creates an operation with `/operation`:

| Data | Purpose |
|------|---------|
| Guild ID, channel ID | Link the operation to the server and message channel |
| Creator’s Discord user ID | Identify the owner |
| Title, date, time, duration, description | Operation content |
| Status | pending / started / finished |

### 1.3 Order boards

When boards and lines are created via `/order` and board interactions:

| Data | Purpose |
|------|---------|
| Guild ID, channel ID | Link the board to the server and channel |
| Board name, kind (prod / transfer / scrap), status | Board metadata |
| Optional operation ID | Link to an active operation |
| Line details (name, category, priority, current, target) | Progress on the order |
| Line / board owner Discord user IDs | Permissions and ownership |
| Optional Logs thread ID | Track the locked Logs thread |
| Short-lived add drafts keyed by user ID | Wizard state while adding a line |

### 1.4 Stockpiles

When a stockpile is added via `/stockpile add`:

| Data | Purpose |
|------|---------|
| Guild ID, channel ID | Link to the server and list channel |
| Creator’s Discord user ID | Identify the owner |
| Region, city, name, 6-digit code | Stockpile entry |
| Expiry / reset timestamps | Expiry / reset timers (2 days and 2 hours) and reminders |

The 6-digit code is stored in **plaintext**. It is entered by users and visible to members who can see the stockpile list channel.

### 1.5 Notifications

When a channel subscribes via `/notify on`:

| Data | Purpose |
|------|---------|
| Guild ID, channel ID | Where to send notifications |
| Notification type | Which events trigger a message |

### 1.6 Tracked Discord messages

To keep order boards and stockpile lists in sync, the Bot stores **Discord message IDs** (and related channel / type metadata). It does **not** store the text of those messages in MongoDB.

### 1.7 Usage statistics

Per guild, the Bot records:

| Data | Purpose |
|------|---------|
| Guild ID, server name | Identify the server |
| Server creation date, bot join / leave dates | Installation lifecycle |
| Server owner Discord user ID | Maintainer reference (e.g. local dashboard contacts) |
| Member count (updated on slash use) | Server size at usage time |
| Command counts and per-command breakdown | Feature usage |
| Operation count (and legacy counters that may remain unused) | Feature-level analytics |

These stats include Discord IDs (guild and server owner). They are used for maintenance and development of the hosted instance.

### 1.8 Interaction logs (files)

On the host machine, each interaction may append a line to `var/logs/<guildId>.log`, including timestamp, guild ID / name, user ID / username, and, when present, content attached to the Discord component message.

---

## 2. What the Bot does not collect

The Bot does **not**:

- Collect email addresses, phone numbers, or accounts outside Discord.
- Collect voice or video activity.
- Collect data from servers where it is not installed.
- Run a general chat archive or monitor every message as a product feature.

The Bot **may read message content** only when needed to:

- Reply to a bot mention or a legacy text-prefix command.
- Find or update its own tracked messages (order boards, stockpile lists).
- Record interaction log lines (see §1.8).

It does not sell or share collected data with third-party analytics providers.

---

## 3. How data is stored

- **MongoDB** — configuration, features, and usage statistics.
- **Log files** — `var/logs/` on the host that runs the Bot.
- **Local dashboard** (optional, self-host / maintainer) — reads MongoDB and Discord for stats; binds to localhost by default (`127.0.0.1`), with optional reverse-proxy access behind login. See [docs/SELF-HOST.md](docs/SELF-HOST.md).

Access on the hosted instance is limited to the Bot runtime and the project maintainer.

---

## 4. Data retention

| Data | Retention |
|------|-----------|
| Server configuration | Until `/setup` data is removed by guild cleanup, or the host deletes it |
| Operations, order boards / lines, stockpiles, notifications, tracked message IDs | Until deleted by users/admins, wiped with `/server reset`, or removed by guild cleanup |
| Usage statistics | Kept after the Bot leaves (leave date set); used for analytics |
| Interaction log files | Controlled by the host; no automatic purge in the Bot |

**Guild cleanup** runs when the Bot leaves a server, the guild is on `BLOCKED_GUILD_IDS`, or guild data exists but the Bot is no longer in that guild at startup. It deletes that guild’s order lines/boards, operations, notification subscriptions, tracked messages, stockpiles, and server configuration. Statistics are kept with a leave date (or removed if the stats row has no server name).

---

## 5. Third-party services

The Bot queries:

- **Steam API** — Foxhole player count. No Discord user data is sent.
- **Foxhole War API** — war status, maps, reports. No Discord user data is sent.

Those services have their own privacy policies. The Bot does not send your collected Discord data to them.

---

## 6. Data sharing

We do not sell, rent, or share collected data with third parties, except if required by law.

---

## 7. Your rights

As a server admin you can:

- Delete operations and order boards with bot commands / board buttons, or wipe boards, stockpiles, and operations with **`/server reset confirm:true`** (Manage Server).
- Remove stockpiles from the stockpile list (Cleanup / Delete all) or via `/server reset`.
- Turn off notifications with `/notify off`.
- Remove the Bot from your server at any time (stops further collection; guild cleanup runs as above).

To request deletion of remaining hosted-instance data for your server (for example statistics), open an issue on [GitHub](https://github.com/Jokod/discord-bot-foxhole/issues).

---

## 8. Self-hosting

If you self-host using the [open-source code](https://github.com/Jokod/discord-bot-foxhole), you control the database and logs. This Privacy Policy applies to the hosted public instance; self-hosters must handle privacy for their own deployment.

---

## 9. Changes

We may update this policy at any time. Continued use of the Bot after publication means you acknowledge the revised policy.

---

## 10. Contact

Privacy questions or deletion requests: [GitHub issues](https://github.com/Jokod/discord-bot-foxhole/issues).
