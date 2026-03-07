# Axobotl

Discord bot with web management dashboard.

**Stack:** discord.js · Sequelize · PostgreSQL · Express · EJS · Bootstrap 5 · TypeScript · Docker

---

## Quick Start

No local Node.js or package installation required — just Docker.

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env: fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET,
#            SESSION_SECRET, and DISCORD_CALLBACK_URL

# 2. Start everything
docker compose up -d
```

The bot and dashboard pull pre-built images from GHCR automatically.
Database tables and slash commands are set up on first start.

Dashboard is available at **http://localhost:3000**

```bash
# View logs
docker compose logs -f

# Stop
docker compose down

# Stop and remove database volume
docker compose down -v
```

## Development

For local development with hot-reload, install [pnpm](https://pnpm.io) and Node.js 22+:

| Script | Description |
|---|---|
| `pnpm dev` | Bot + dashboard in watch mode |
| `pnpm dev:bot` | Bot only |
| `pnpm dev:dashboard` | Dashboard only |
| `pnpm build` | Compile TypeScript |
| `pnpm typecheck` | Type-check only |
| `pnpm deploy-commands` | Register slash commands with Discord |
| `pnpm db:sync` | Sync Sequelize models to DB |
| `pnpm test:unit` | Unit tests |
| `pnpm test:e2e` | E2E tests |

## Docker Images

Pre-built images are published to GitHub Container Registry on every push to `main`:

| Image | Tag | When |
|---|---|---|
| `ghcr.io/axolotl-army/axobotl-bot` | `latest`, `vX.Y`, `vX.Y.Z` | Version tag push |
| `ghcr.io/axolotl-army/axobotl-bot` | `dev`, `main`, `sha-*` | Push to `main` |
| `ghcr.io/axolotl-army/axobotl-dashboard` | `latest`, `vX.Y`, `vX.Y.Z` | Version tag push |
| `ghcr.io/axolotl-army/axobotl-dashboard` | `dev`, `main`, `sha-*` | Push to `main` |

To use your own fork's images, set `GHCR_OWNER=your-github-username` in `.env`.

```bash
# Run specific services
docker compose up bot postgres -d
docker compose up dashboard postgres -d

# Build images locally instead of pulling
docker compose build
```

## Environment Variables

See [`.env.example`](.env.example) for a full annotated list.

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✓ | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | ✓ | Application (client) ID |
| `DISCORD_CLIENT_SECRET` | ✓ | OAuth2 client secret |
| `DATABASE_URL` | ✓ | PostgreSQL connection string |
| `SESSION_SECRET` | ✓ | Random secret for session signing |
| `DISCORD_CALLBACK_URL` | ✓ | OAuth2 redirect URL |
| `BOT_OWNER_ID` | — | Your Discord user ID (for owner-only routes) |

## Discord App Setup

1. Create application at [discord.com/developers](https://discord.com/developers/applications)
2. Create a bot and copy the token → `DISCORD_TOKEN`
3. Copy Application ID → `DISCORD_CLIENT_ID`
4. Under OAuth2 → General, add redirect: `http://localhost:3000/auth/callback`
5. Copy Client Secret → `DISCORD_CLIENT_SECRET`
6. Invite bot to server with `applications.commands` + `bot` scopes
