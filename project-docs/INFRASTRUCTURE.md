# Infrastructure — Axobotl

## Environments

| Environment | Bot | Dashboard | Database |
|---|---|---|---|
| Development | `pnpm dev:bot` (tsx watch) | `pnpm dev:dashboard` (tsx watch) | Local PostgreSQL |
| Docker (local) | `docker compose up bot` | `docker compose up dashboard` | `docker compose up postgres` |
| Production | Docker image: `axobotl-bot:latest` | Docker image: `axobotl-dashboard:latest` | PostgreSQL 16 container |

## Ports

| Service | Dev Port | Test Port |
|---|---|---|
| Dashboard | 3000 | 4000 |
| PostgreSQL | 5432 | 5432 |

## Docker Images

Both images are built from the same multi-stage `Dockerfile`:
- **Stage `bot`** — Node 20 Alpine, runs `dist/bot/index.js`
- **Stage `dashboard`** — Node 20 Alpine, runs `dist/dashboard/index.js`, exposes port 3000

## GitHub Actions CI/CD

| Trigger | Jobs |
|---|---|
| Push to `main` or `develop`, PRs to `main` | Type-check, unit tests, E2E tests |
| Push to `main` | Build + push Docker images to Docker Hub |

Required GitHub Secrets:
- `DOCKER_HUB_USER` — Docker Hub username
- `DOCKER_HUB_TOKEN` — Docker Hub access token

## Required Environment Variables

See `.env.example` for a full annotated list. Critical variables:
- `DISCORD_TOKEN` — Bot token from Discord Developer Portal
- `DISCORD_CLIENT_ID` — Application ID
- `DISCORD_CLIENT_SECRET` — OAuth2 secret
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Random 32+ byte hex string
