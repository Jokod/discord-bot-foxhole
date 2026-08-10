**Comment utiliser FoxBot**

Bot de coordination logistique **Foxhole** : tableaux d’ordres, opérations, codes de dépôt — pas un inventaire in-game.

**1. Première config**
1. Inviter le bot sur le serveur
2. Lancer **`/setup`** une fois : langue + camp (warden / colonial) · option `logs` pour un fil Logs (désactivé par défaut)
3. (Recommandé) Suivre les annonces : rejoindre le Discord support → salon **Announcements** → **Follow**

**2. Commandes utiles**
- `/help [commande]` — liste ou détail d’une commande (autocomplete)
- `/about` — support, Follow Announcements, GitHub
- `/operation` — créer / suivre une OP
- `/order create` — tableau **prod** · **transfer** · **scrap** (lien OP possible)
- `/stockpile add` / `list` / `manage` — codes de dépôt + timers
- `/war status` · `maps` · `report` — API de guerre
- `/notify on|off` — alertes stockpile
- `/server infos` · `lang` · `camp` · `logs` · `reset` — config serveur

**3. Tableaux d’ordres**
Sur le message du board : sélectionner une ligne → **-1 / +1 / +4 / +9 / Max** · Priorité · Add · Correct · Delete · Close / Reopen.
Jusqu’à **50 lignes**. Un board fermé reste en lecture seule jusqu’à **Reopen**.

**4. Nouvelle guerre**
`/server reset confirm:true` — efface boards, stockpiles et opérations (garde langue / camp / notifs). Preview avec `confirm:false`.

Plus de détails (permissions, logs, stockpiles) :
https://github.com/Jokod/discord-bot-foxhole/blob/main/docs/USAGE.md
