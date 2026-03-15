# Infrastructure — Axobotl

## Environment Overview

```
┌──────────────────────── Production (Docker Compose) ─────────────────────────┐
│                                                                               │
│  ┌─────────────────────────┐    ┌─────────────────────────┐                 │
│  │   axobotl-bot:latest    │    │ axobotl-dashboard:latest │                 │
│  │   (ghcr.io)             │    │ (ghcr.io)                │                 │
│  │   Node 20 Alpine        │    │ Node 20 Alpine           │                 │
│  │   target: bot           │    │ target: dashboard        │                 │
│  │   dist/bot/index.js     │    │ Next.js 15 standalone    │                 │
│  │                         │    │ port: 3000               │<── HTTP :3000   │
│  └────────────┬────────────┘    └─────────────┬────────────┘                 │
│               │                               │                              │
│               └───────────────┬───────────────┘                              │
│                               │ depends_on: postgres (healthy)               │
│                               ▼                                              │
│                ┌──────────────────────────────┐                              │
│                │     postgres:16-alpine        │                              │
│                │     port: 5432               │                              │
│                │     volume: postgres_data     │                              │
│                └──────────────────────────────┘                              │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────── Development ─────────────────────────┐
│                                                              │
│  pnpm dev:bot        → tsx watch src/bot/index.ts                   │
│  pnpm dev:dashboard  → cd src/dashboard && npx next dev -p 3000     │
│  docker compose up postgres -d  → PostgreSQL on :5432               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## CI/CD Pipeline (GitHub Actions)

```
Push to main/develop  ──► test job
Push tag v*           ──► test job ──► docker job
PR to main            ──► test job

test job:
  ├── PostgreSQL 16 service (axobotl_test DB)
  ├── pnpm install --frozen-lockfile
  ├── pnpm typecheck
  └── pnpm test:unit       (Vitest, port 5432)

docker job (main push or v* tag, after test):
  ├── Login to ghcr.io
  ├── Build + push axobotl-bot
  │     :dev       (every push to main)
  │     :latest    (v* tags only)
  │     :vX.Y.Z    (semver tags)
  └── Build + push axobotl-dashboard
        :dev       (every push to main)
        :latest    (v* tags only)
        :vX.Y.Z    (semver tags)
```

## Environments

| Environment | Bot | Dashboard | Database |
|---|---|---|---|
| Development | `pnpm dev:bot` (tsx watch) | `pnpm dev:dashboard` (next dev :3000) | Local PostgreSQL :5432 |
| Docker (local) | `docker compose up bot` | `docker compose up dashboard` | `docker compose up postgres` |
| Production | `axobotl-bot:latest` | `axobotl-dashboard:latest` | PostgreSQL 16 container |
| CI | not started | not started | postgres service (axobotl_test) |

## Ports

| Service | Dev Port | Test Port |
|---|---|---|
| Dashboard | 3000 | 4000 |
| PostgreSQL | 5432 | 5432 |

## Docker Images

Both images are built from the same multi-stage `Dockerfile`:
- **Stage `bot`** — Node 20 Alpine, runs `dist/bot/index.js`
- **Stage `dashboard`** — Node 20 Alpine, Next.js 15 standalone output, exposes port 3000

Registry: `ghcr.io/<owner>/axobotl-bot` and `ghcr.io/<owner>/axobotl-dashboard`

## Required Environment Variables

See `.env.example` for a full annotated list. Critical variables:
- `DISCORD_TOKEN` — Bot token from Discord Developer Portal
- `DISCORD_CLIENT_ID` — Application ID
- `DISCORD_CLIENT_SECRET` — OAuth2 secret
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_URL` — Full URL of the dashboard (e.g. `http://localhost:3000`)
- `BOT_OWNER_ID` — Discord user ID allowed to access the dashboard
- `SESSION_SECRET` — Random 32+ byte hex string (NextAuth secret)

## Changelog

| Date | Change |
|---|---|
| 2026-03-08 | Updated infrastructure diagram from code scan (docker-compose.yml, ci.yml) |
| 2026-03-15 | Updated for Next.js 15 dashboard, removed Playwright E2E from CI, updated env vars |
