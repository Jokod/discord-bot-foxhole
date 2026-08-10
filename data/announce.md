**FoxBot 1.0.0 is live**

Major update: logistics threads are gone — **order boards** take over.

**What changed**
- `/logistics` and `/material` **removed**
- New **`/order`** — production, front transfer, scrap/farm boards
- `/stockpile`, `/operation`, `/war`, `/notify` stay (some renames: `/notify`, `/about`)
- Optional stats dashboard for self-host

**What you should do**
1. Recreate useful boards with `/order create`
2. Delete leftover old logistics / material messages
3. Self-host: backup Mongo → `migrate-v2.js` → restart (see docs)

**News, bugs & support** — join the Discord and Follow Announcements:
https://discord.gg/bjkzG9YsX5
1. Open **Announcements** → **Follow** (needs Manage Webhooks)
2. Pick a channel on your server

**GitHub** (source, issues):
https://github.com/Jokod/discord-bot-foxhole
Issues: https://github.com/Jokod/discord-bot-foxhole/issues/new
