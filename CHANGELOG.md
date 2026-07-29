# Changelog

## [1.0.0] — 2026-07-29

Première version majeure de la refonte : abandon de la logistique opérationnelle (threads / demandes), **commandes de prod / transfert front** (`/order`), stockpile allégé, surface slash simplifiée.

### Breaking changes

- Suppression de **`/logistics`**, **`/material`**, et du bouton Logistics sur les opérations.
- Suppression du modèle Mongo **`Group`** (threads logistique).
- Remplacement inventaire salon par **ordres** : modèles **`OrderBoard`** / **`OrderLine`** (plus de board inventaire `Stock` / `Material`).
- Slash **`/order`** (FR **`/commande`**) — pas de `/stock` inventaire (évite la collision avec `/stockpile`).
- **`Stockpile.group_id`** renommé en **`channel_id`** (script de migration fourni).
- Renames de commandes slash :
  - `/create_operation` → **`/operation`**
  - `/notification` → **`/notify`** (`on` / `off` / `list`)
  - `/foxhole` fusionné dans **`/war`**
- Localisation FR de `/stockpile` : **`depot`**.
- Suppression des commandes préfixe **`!help`** et **`!ping`** (reste `!reload` owner).
- Anciennes demandes logistique / boards inventaire **non migrés** sémantiquement (purge via migrate).

### Added

#### Ordres (`/order` · FR `/commande`)
- Boards **Production**, **Transfert front** et **Scrap / farm** : ligne = `actuel/objectif` + **-1 / +1 / +4 / +9 / Max**.
- Slash : **`create`** (`type`, `name`, `operation` optionnelle) / **`remove`** (autocomplete).
- UI : sélection de ligne + **-1 / +1 / +4 / +9 / Max** + priorité · Ajouter / Corriger / Clôturer / Rouvrir.
- Thread Discord **Logs** optionnel (`/setup logs` / `/server logs`, **défaut off**) — autonome, **verrouillé** ; suppression toujours au remove / désactivation.
- Priorité (low/neutral/high) et urgence (URGENT / OK / BAS) ; stock en `actuel/objectif` ; max **50** lignes (2×25 selects).
- Services `services/order/`, sync `utils/orderBoardSync.js`, i18n `ORDER_*` (en/fr/ru/zh-cn).
- Resync des boards ouverts au démarrage (`syncAllOrderBoards`).

#### Stockpile
- Slash réduit à **`add`** | **`list`**.
- Panel : boutons reset timer, select soft-delete, Cleanup / Delete all (Manage Server).
- Champ **`channel_id`**.

- Slash **`/about`** (FR `/a-propos`) : liens GitHub + Discord support (remplace `/github`).
- Autocomplete Discord enregistré au boot.
- Scripts **`scripts/migrate-v2.js`** (purge logistics + inventaire `stocks`/`materials`, rename channel_id, cleanup stats) et stub resync.
- Docs : `docs/MIGRATION_V2.md` (changements + migration + checklist).

#### Autre
- `/war status` enrichi (joueurs Steam) ; lien stats dans `maps`.
- `/server reset confirm:true` (Manage Server) : wipe boards `/order`, stockpiles et opérations pour une nouvelle guerre ; `confirm:false` = aperçu des counts. Config serveur + notifs conservés.
- Purge i18n legacy inventaire ; index unique stockpile `(server_id, id)`.

### Changed

- Permissions order : **ouverts** = create / +qty / add / correct / priorité ; **restreints** (owner ligne/board ou Manage Guild/Channels) = delete line / close / reopen / remove board.
- Autocomplete `/order operation` : opérations **actives** seulement (pending/started) ; refus si op terminée.
- Cleanup guild : `OrderBoard` / `OrderLine` (plus de `Group`).
- Ops cancel / finished : suppression des **order boards** liés (`operation_id`) + messages Discord.
- `Operation.channel_id` pour cleanup Discord au `/server reset`.
- README, CONTRIBUTING, PRIVACY, TERMS, `/help` alignés sur la surface 1.0.0.
- Stockpile Cleanup / Delete all : Manage Guild **ou** Manage Channels.

### Removed

- Toute l’UI et les slash logistics / material.
- Inventaire salon `/stock` (selects, priorité, qty−).
- Commande **`/foxhole`**.
- Préfixe **`!help`**, **`!ping`**.
- Clés i18n logistics / inventaire `STOCK_*` (hors `STOCKPILE_*`) et labels `MATERIAL_*` legacy inutilisés.

### Migration (self-host)

1. Backup MongoDB.
2. `node scripts/migrate-v2.js --dry-run` puis `node scripts/migrate-v2.js`.
3. Restart du bot (resync stockpile + order boards au `ready`).
4. Ré-enregistrer les slash (`/order` ; disparition `/stock` / logistics).

Détails migration et validation : [docs/MIGRATION_V2.md](docs/MIGRATION_V2.md).

---

## [0.9.14] — 2026-03

Dernière version avant la refonte (logistics opérationnelle encore présente). Voir l’historique git `release/0.9.14`.
