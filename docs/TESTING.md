# Testing

```bash
npm test
npm run test:watch
npm run test:coverage
npm run test:ci          # lint + i18n parity + coverage (same gates as GitHub Actions)
npm run i18n:check       # en/fr/ru/zh-cn key parity + ORDER_* presence
```

CI (`.github/workflows/integration.yaml`) runs lint, i18n parity, then the full Jest suite with coverage thresholds (order, migrate-v2, etc.). Tag publishes (`.github/workflows/docker.yaml`) reuse that workflow before build & push. Tests live under `__tests__/` and mirror source layout; new files are picked up automatically.

Dashboard coverage lives under `__tests__/dashboard/` (auth, HTTP helpers, request handler, summary/contacts/materials load, guild-action adapter, frontend assets) plus `__tests__/utils/` for `guildAdminActions`, `blockedGuilds`, and `announceChannels`. Wiki icon sync coverage lives under `__tests__/scripts/wiki-sync/` (`sync-icons`, content helpers, …).

Manual smoke after upgrades: checklist in [MIGRATION.md](MIGRATION.md). Ops / env: [SELF-HOST.md](SELF-HOST.md).
