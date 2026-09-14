# FoxBot Dashboard — Public API

Opt-in JWT API for external tools (CI, scripts, monitoring). **Disabled by default.**

## Enable

In `.env` (dashboard service):

```env
DASHBOARD_API=1
DASHBOARD_API_JWT_SECRET=<openssl rand -hex 32>
DASHBOARD_API_MATERIALS=1   # GET /api/public/materials/categories + /items
DASHBOARD_API_DATA=1        # GET /api/public/data
DASHBOARD_API_GUILDS=1      # GET /api/public/guilds (sensitive)
DASHBOARD_API_DOCS=1        # /api/docs + /api/openapi.json
```

`DASHBOARD_API_JWT_SECRET` must be ≥ 32 random bytes. Changing it invalidates all existing JWTs.

## Authentication

1. Sign in to the dashboard (session cookie).
2. Open **Profile → API tokens**.
3. Create a token (password required). **Copy the JWT once** — it is not stored in full.

Send requests with:

```http
Authorization: Bearer <jwt>
```

Scopes on the token must match the route. Token records are stored in MongoDB (`dashboard_api_tokens`) and can be revoked from Profile.

## Routes

| Route | Scope | Description |
|-------|-------|-------------|
| `GET /api/public/materials/categories` | `materials` | Material categories (`limit`, `offset`) |
| `GET /api/public/materials/items` | `materials` | Material items (`limit`, `offset`, optional `category`, `subcategory`) |
| `GET /api/public/data` | `data` | Aggregated KPIs (no Discord user IDs) |
| `GET /api/public/guilds` | `guilds` | Active guild list (guild IDs — sensitive) |

## Rate limits

- **60 requests / 15 min / IP / route**
- **120 requests / 15 min / JWT (`jti`) / route**
- Token creation: **5 / hour / session**, max **10 active tokens**

Responses: `429 API_RATE_LIMIT` with optional `retry_after_ms`.

## Errors

| Code | HTTP |
|------|------|
| `API_DISABLED` | 404 |
| `API_TOKEN_INVALID` | 401 |
| `API_TOKEN_EXPIRED` | 401 |
| `API_SCOPE_FORBIDDEN` | 403 |
| `API_RATE_LIMIT` | 429 |

## Examples

```bash
curl -sS -H "Authorization: Bearer $TOKEN" \
  'http://127.0.0.1:3847/api/public/materials/items?limit=10&offset=0' | jq '.items | length'
```

Interactive docs (session required): `GET /api/docs`  
OpenAPI JSON: `GET /api/openapi.json` (filtered by enabled scopes)

## Wiki sync (session only)

Wiki synchronization is **not** exposed on the public API. Use the **Materials** tab or CLI (`npm run wiki:sync-materials`). Writes require `WIKI_SYNC_WRITE=1`.

## HTTPS

Use a reverse proxy and `DASHBOARD_COOKIE_SECURE=1` / `DASHBOARD_PUBLIC_ORIGIN` in production. Do not expose the dashboard port directly to the Internet without TLS.
