# Changelog

## [1.0.0] — 2026-08-10

Major rewrite from **0.9.x**: logistics threads/requests are gone; **order boards** (`/order`) become the logistics core; stockpile and slash surface are simplified; local **stats dashboard** can administer guilds (leave / blacklist / broadcast); **Docker / Compose** self-host stack published to GHCR.

### Breaking (vs 0.9)

- Removed **`/logistics`**, **`/material`**, logistics Group threads, and the Logistics button on operations.
- Old material requests are **not** converted to orders (DB purge via migrate — recreate with `/order`).
- **`Stockpile.group_id`** → **`channel_id`**.
- Slash renames: `/create_operation` → **`/operation`**, `/notification` → **`/notify`**, `/foxhole` merged into **`/war`**.
- Removed prefix **`!help`** / **`!ping`** (`!reload` kept for the owner).
- Removed **`/newsletter`** / newsletter publish flow.
- Requires **Node.js ≥ 20** (see `.nvmrc`).

### Added

- **`/order`**: production, front transfer, and scrap/farm boards (`current/target`, qty buttons, priority, optional logs thread, optional link to an operation).
- **`/about`**: GitHub + support Discord (replaces `/github`).
- **`/server reset`**: wipe orders / stockpiles / ops for a new war (preview without `confirm`).
- **`/war`**: `status` (incl. Steam players), `maps`, `report`.
- **`/stockpile manage`**: ephemeral panel (depot creator or Manage Guild/Channels) for soft-delete select, **Cleanup** (purge marked-deleted only), and **Delete all**.
- **Stats dashboard** (localhost): KPIs, charts, contacts, server detail; admin actions **leave / blacklist / unblacklist / broadcast**; blacklisted guilds list (Mongo + `BLOCKED_GUILD_IDS`).
- **Docker**: `compose.yaml` (bot + optional `with-mongo` / `dashboard`), image `ghcr.io/jokod/foxbot` (amd64/arm64) on git tags.
- Migration script **`scripts/migrate-v2.js`** + guide [docs/MIGRATION.md](docs/MIGRATION.md).

### Changed

- **Stockpile** slash: **`add`** | **`list`** | **`manage`**. Public **`list`** keeps reset buttons only; remove / cleanup / delete-all live under **`manage`**.
- Order / stockpile permissions and guild cleanup aligned to the new models.
- Docs (README, `docs/USAGE`, `docs/SELF-HOST`, CONTRIBUTING, PRIVACY, TERMS) and `/help` match the 1.0.0 surface.

### Removed

- Logistics / material commands and UI; **`/foxhole`**; **`/github`** (→ `/about`); **`/newsletter`**; prefix **`!help`** / **`!ping`**; obsolete logistics i18n keys.

### Migration (self-host)

1. Backup MongoDB.
2. `node scripts/migrate-v2.js --dry-run` then `node scripts/migrate-v2.js`.
3. Deploy 1.0.0 and restart (stockpile + order board resync on `ready`).
4. Re-register slash; staff recreate useful boards with `/order` and clean old logistics messages.

Details: [docs/MIGRATION.md](docs/MIGRATION.md).

---

## [0.9.14] — 2026-03

Last release before the rewrite (operational logistics still present). See git history for `release/0.9.14`.
