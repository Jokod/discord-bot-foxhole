# Changelog

## [1.0.0] — 2026-07-29

First major rewrite: operational logistics threads/requests removed; **production / front transfer / scrap order boards** (`/order`); leaner stockpile surface; simplified slash set.

### Breaking changes

- Removed **`/logistics`**, **`/material`**, and the Logistics button on operations.
- Removed Mongo **`Group`** model (logistics threads).
- Replaced channel inventory with **orders**: **`OrderBoard`** / **`OrderLine`** (no inventory `Stock` / `Material` boards).
- Slash **`/order`** — no inventory `/stock` (avoids collision with `/stockpile`).
- **`Stockpile.group_id`** renamed to **`channel_id`** (migration script provided).
- Slash renames:
  - `/create_operation` → **`/operation`**
  - `/notification` → **`/notify`** (`on` / `off` / `list`)
  - `/foxhole` merged into **`/war`**
- Removed prefix commands **`!help`** and **`!ping`** (`!reload` remains for the owner).
- Old logistics requests / inventory boards are **not** semantically migrated (purged via migrate).

### Added

#### Orders (`/order`)
- **Production**, **front transfer**, and **scrap / farm** boards: line = `current/target` + **-1 / +1 / +4 / +9 / Max**.
- Slash: **`create`** (`type`, `name`, optional `operation`) / **`remove`** (autocomplete).
- UI: line select + **-1 / +1 / +4 / +9 / Max** + priority · Add / Correct / Close / Reopen.
- Optional Discord **Logs** thread (`/setup logs` / `/server logs`, **default off**) — standalone, **locked**; always deleted on board remove / logs off.
- Priority (low/neutral/high) and urgency (URGENT / OK / LOW); stock as `current/target`; max **50** lines (2×25 selects).
- Services `services/order/`, sync `utils/orderBoardSync.js`, i18n `ORDER_*` (en/fr/ru/zh-cn).
- Resync open boards on startup (`syncAllOrderBoards`).

#### Stockpile
- Slash reduced to **`add`** | **`list`**.
- Panel: reset timer, soft-delete select, Cleanup / Delete all (Manage Server).
- Field **`channel_id`**.

#### Other
- Slash **`/about`**: GitHub + support Discord links (replaces `/github`).
- Discord autocomplete registered at boot.
- Scripts **`scripts/migrate-v2.js`** (purge logistics + inventory `stocks`/`materials`, rename channel_id, cleanup stats) and resync stub.
- Docs: `docs/MIGRATION.md` (changes + migration + checklist).
- `/war status` enriched (Steam players); stats link in `maps`.
- `/server reset confirm:true` (Manage Server): wipe `/order` boards, stockpiles, and operations for a new war; `confirm:false` = count preview. Server config + notifications kept.
- Legacy inventory i18n purge; unique stockpile index `(server_id, id)`.

### Changed

- Order permissions: **open** = create / ±qty / add / correct / priority; **restricted** (line/board owner or Manage Guild/Channels) = delete line / close / reopen / remove board.
- Autocomplete `/order operation`: **active** ops only (pending/started); reject finished ops.
- Guild cleanup: `OrderBoard` / `OrderLine` (no `Group`).
- Ops cancel / finished: delete linked **order boards** (`operation_id`) + Discord messages.
- `Operation.channel_id` for Discord cleanup on `/server reset`.
- README, CONTRIBUTING, PRIVACY, TERMS, `/help` aligned to the 1.0.0 surface.
- Stockpile Cleanup / Delete all: Manage Guild **or** Manage Channels.

### Removed

- All logistics / material UI and slash commands.
- Channel inventory `/stock` (selects, priority, qty−).
- Command **`/foxhole`**.
- Prefix **`!help`**, **`!ping`**.
- Legacy logistics / inventory i18n keys `STOCK_*` (except `STOCKPILE_*`) and unused `MATERIAL_*` labels.

### Migration (self-host)

1. Backup MongoDB.
2. `node scripts/migrate-v2.js --dry-run` then `node scripts/migrate-v2.js`.
3. Restart the bot (stockpile + order board resync on `ready`).
4. Re-register slash (`/order`; `/stock` / logistics gone).

Migration details and validation: [docs/MIGRATION.md](docs/MIGRATION.md).

---

## [0.9.14] — 2026-03

Last release before the rewrite (operational logistics still present). See git history for `release/0.9.14`.
