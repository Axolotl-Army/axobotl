# Axobotl

Discord bot with web management dashboard.

**Stack:** discord.js · Sequelize · PostgreSQL · Express · EJS · Bootstrap 5 · TypeScript · Docker

---

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DATABASE_URL, SESSION_SECRET

# 3. Start PostgreSQL
docker compose up postgres -d

# 4. Sync database
pnpm db:sync

# 5. Register slash commands
pnpm deploy-commands

# 6. Start development
pnpm dev
# Bot runs with live reload, Dashboard at http://localhost:3000
```

## Commands

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

## Docker

```bash
# Run everything
docker compose up -d

# Bot only
docker compose up bot postgres -d

# Dashboard only
docker compose up dashboard postgres -d
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
