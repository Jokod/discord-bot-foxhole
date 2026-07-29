# Self-host

Guide pour **héberger ta propre instance** du bot Foxhole (Discord + MongoDB).

Instance publique / support : [discord.gg/bjkzG9YsX5](https://discord.gg/bjkzG9YsX5) · code : [GitHub](https://github.com/Jokod/discord-bot-foxhole).

| Sujet | Lien |
|-------|------|
| Index docs | [README.md](README.md) |
| Commandes (usage) | [USAGE.md](USAGE.md) |
| Migrations de version | [MIGRATION.md](MIGRATION.md) |
| Tests | [TESTING.md](TESTING.md) |
| Notes de release | [CHANGELOG.md](../CHANGELOG.md) |
| Confidentialité | [PRIVACY_POLICY.md](../PRIVACY_POLICY.md) |
| Contribuer | [CONTRIBUTING.md](../CONTRIBUTING.md) |

---

## Prérequis

- **Node.js ≥ 20** (LTS) — voir `.nvmrc`
- **MongoDB** (local ou Atlas)
- Application bot Discord ([Developer Portal](https://discord.com/developers/applications)) avec token

---

## Installation

```bash
git clone https://github.com/Jokod/discord-bot-foxhole.git
cd discord-bot-foxhole
npm install
cp .env.dist .env
```

Édite `.env` (voir [Variables d’environnement](#variables-denvironnement)), puis :

```bash
npm run start    # production
npm run dev      # développement (nodemon)
```

### Invitation Discord

Scopes : **`bot`** + **`applications.commands`**.

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=328565001280&scope=bot%20applications.commands
```

Permissions incluses (entre autres) : gérer les messages/salons utiles aux boards, **Create Public Threads** + **Send Messages in Threads** (threads Logs des `/order`).

Après invite : **`/setup`** une fois (langue + camp ; `logs` optionnel, défaut **false**).

---

## Variables d’environnement

Référence : [`.env.dist`](../.env.dist).

| Variable | Requis | Rôle |
|----------|--------|------|
| `TOKEN` | oui | Token bot Discord |
| `CLIENT_ID` | oui | ID application |
| `MONGODB_URL` | oui | URI Mongo |
| `MONGODB_NAME` | oui | Nom de la base |
| `OWNER` | oui | ID Discord owner (`!reload`, etc.) |
| `TEST_GUILD_ID` | recommandé en `dev` | Guild de test |
| `APP_ENV` | oui | `dev` ou `prod` |
| `PREFIX` | non | Préfixe commandes texte (défaut `!`) |
| `TZ` | non | Fuseau (ex. `Europe/Paris`) |
| `BLOCKED_GUILD_IDS` | non | IDs de guilds à quitter (séparés par des virgules) |
| `GITHUB_URL` | non | Affiché dans `/about` |
| `GITHUB_ISSUES_URL` | non | Override lien issues (`GITHUB_URL/issues/new` par défaut) |
| `DISCORD_INVITE_URL` | non | Invite support + texte Follow annonces dans `/about` |

### `APP_ENV`

| Valeur | Comportement slash |
|--------|-------------------|
| `prod` | Enregistrement **global** des commandes au démarrage |
| `dev` | Enregistrement **guild** (`TEST_GUILD_ID`) — plus rapide pour itérer |

En `dev`, d’anciennes commandes **globales** peuvent encore apparaître : les nettoyer dans le Developer Portal ou attendre la propagation.

---

## Données & responsabilité

- Toutes les données restent dans **ta** MongoDB.
- Au départ d’un serveur (leave / blocklist / absent au boot), cleanup guild : boards, lignes, ops, notifs, tracked messages, stockpiles, config `Server` ; `Stats.left_at` renseigné.
- Détail : [PRIVACY_POLICY.md](../PRIVACY_POLICY.md).

---

## Migration / upgrade

Avant toute montée de version majeure :

1. **Backup** MongoDB  
2. Suivre **[MIGRATION.md](MIGRATION.md)** (scripts, collections touchées, checklist)  
3. Déployer le code → **restart**  
4. Vérifier les slash (re-register au boot)

Exemple **→ 1.0.0** : `node scripts/migrate-v2.js --dry-run` puis `node scripts/migrate-v2.js`, puis recreer les boards avec `/order` (pas de conversion auto logistics/stock → order).

---

## Exploitation courante

| Action | Commande / note |
|--------|------------------|
| Démarrer | `npm run start` |
| Restart | Relance le process → resync boards ouverts + listes stockpile + slash |
| Nouvelle guerre (wipe data jeu) | `/server reset confirm:true` (Manage Server) — aperçu avec `confirm:false` |
| Threads Logs order | `/setup logs` ou `/server logs` |
| Owner | `!reload <commande>` |
| Dashboard stats (local) | Voir [Dashboard](#dashboard-stats-local) |

### Annonces GitHub → Discord (optionnel)

Pour poster les **releases** dans un salon Annonces : webhook Discord + suffixe **`/github`** sur l’URL, event GitHub **Releases**. Dans un salon Annonces, **Publier** le message pour les serveurs qui **Suivent**.

---

## Dashboard stats (local)

Petit tableau de bord **local** (KPIs, graphiques, liste des serveurs, contacts Discord) qui lit **ta** MongoDB. Utile pour l’ops self-host — **pas** exposé publiquement.

| | |
|--|--|
| Code | [`.dashboard/`](../.dashboard/) |
| URL | `http://127.0.0.1:3847` (écoute **localhost uniquement**) |
| Env | Même fichier que le bot (`TOKEN`, `MONGODB_*`) |

### Démarrage

```bash
# avec ton .env (défaut Makefile = .env.prod)
make dashboard-start DASHBOARD_ENV_FILE=.env

# ou
DASHBOARD_ENV_FILE=.env npm run dashboard
```

| Commande Make | Effet |
|---------------|--------|
| `make dashboard-start` | Démarre en arrière-plan |
| `make dashboard-stop` | Arrête |
| `make dashboard-restart` | Restart |
| `make dashboard-status` | Statut / pid |
| `make dashboard-open` | Ouvre le navigateur |
| `make dashboard-logs` | Tail des logs |

Overrides optionnels : `DASHBOARD_PORT=3847`, `DASHBOARD_ENV_FILE=.env`.

### Contenu

- Vue d’ensemble : activité, joins/leaves, tailles, top commandes / serveurs  
- Commandes : répartition globale, filtre vers les serveurs  
- Serveurs : recherche, filtres, tri, fiche (langue, camp, stats)  
- Contacts : owners Discord + créateurs d’ops / stockpiles (résolution via `TOKEN`)  
- Produit : order boards, langues, camps, notifs, ops  

L’onglet Contacts appelle l’API Discord (`TOKEN`) : owners des guilds **où le bot est encore**, et résolution des pseudos. Les `owner_id` sont aussi persistés dans `Stats` au join / ready / leave pour rester visibles après un départ.

### Sécurité

- Bind **127.0.0.1** seulement — ne pas reverse-proxyer sans auth.  
- Même secrets que le bot : ne pas committer `.env` / `.env.*` (hors `.env.dist`).

---

## Wiki sync (materials)

Les JSON sous `data/materials/` alimentent **Ajouter** sur les boards `/order`.

| Commande npm | Effet |
|--------------|--------|
| `npm run wiki:sync-materials` | Maj descriptions / factions des entrées existantes |
| `npm run wiki:sync-materials:dry` | Dry-run |
| `npm run wiki:sync-materials:add-missing` | Import pages wiki manquantes |
| `npm run wiki:sync-materials:add-missing:and-sync` | Import + synchro complète |

Source : [foxhole.wiki.gg](https://foxhole.wiki.gg). Préférer le script / le routing (`scripts/lib/wiki-sync/`) plutôt que l’édition manuelle massive.

---

## Tests (avant deploy)

```bash
npm test
npm run test:ci      # lint + i18n + coverage (comme la CI)
npm run i18n:check
```

CI : [`.github/workflows/integration.yaml`](../.github/workflows/integration.yaml).

---

## Dépannage rapide

| Problème | Piste |
|----------|--------|
| Slash manquantes / anciennes | Restart en `prod` ; attendre quelques minutes ; vérifier scopes invite |
| Bot muet | Token, intents, permissions salon, `/setup` fait |
| Mongo error | `MONGODB_URL` / `MONGODB_NAME`, réseau Atlas |
| Threads Logs absents | `logs:true` + permissions threads |
| `/about` vide | Renseigner `GITHUB_URL` / `DISCORD_INVITE_URL` |
| Dashboard ne démarre pas | Vérifier `DASHBOARD_ENV_FILE` (souvent `.env`), `TOKEN` / Mongo ; logs : `make dashboard-logs` |
| Contacts sans pseudo | `TOKEN` invalide ou expiré dans le fichier d’env du dashboard |

Support communauté (pas ta prod clan) : [discord.gg/bjkzG9YsX5](https://discord.gg/bjkzG9YsX5).
