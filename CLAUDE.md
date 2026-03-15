# CLAUDE.md — Axobotl

> Discord bot + web dashboard: discord.js · Sequelize · PostgreSQL · Express · Bootstrap 5

---

## Quick Reference — Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run bot + dashboard concurrently (hot-reload) |
| `pnpm dev:bot` | Bot only (tsx watch) |
| `pnpm dev:dashboard` | Dashboard only (tsx watch, port 3000) |
| `pnpm build` | Compile TypeScript → `dist/` |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm deploy-commands` | Register slash commands with Discord |
| `pnpm db:sync` | Sync Sequelize models to database |
| `pnpm test:unit` | Run unit tests (Vitest) |
| `docker compose up` | Start all services with PostgreSQL |

---

## Architecture

- **`src/bot/`** — discord.js bot process
- **`src/dashboard/`** — Express web dashboard process
- **`src/shared/`** — Sequelize models shared between both services
- **`views/`** — EJS templates with Bootstrap 5
- **`public/`** — Static assets (CSS, JS)
- **`scripts/`** — Dev utilities (deploy-commands, db-sync)

See `project-docs/ARCHITECTURE.md` for the full data-flow diagram.

---

## Ports

| Service | Dev Port | Test Port |
|---|---|---|
| Dashboard | 3000 | 4000 |
| PostgreSQL | 5432 | 5432 |

---

## Critical Rules

### 0. NEVER Publish Sensitive Data
- NEVER commit `.env` — ALWAYS verify it is in `.gitignore`
- NEVER commit `DISCORD_TOKEN`, `DISCORD_CLIENT_SECRET`, or `SESSION_SECRET`
- Before ANY commit: verify no secrets are included

### 1. TypeScript Always
- ALL new files must be TypeScript with strict mode
- NEVER use `any` — use proper types or `unknown`
- `pnpm typecheck` must pass with zero errors before committing

### 2. API Versioning
- ALL REST API endpoints MUST use `/api/v1/` prefix
- Example: `GET /api/v1/stats` ✓ | `GET /api/stats` ✗

### 3. Database Access — Sequelize
This project uses **Sequelize** (not StrictDB) due to ORM requirements. See `project-docs/DECISIONS.md` ADR-001.

- ALWAYS use the shared `sequelize` instance from `src/shared/database.ts`
- NEVER create additional Sequelize instances in individual files
- NEVER import `pg` directly — use Sequelize's API
- ALWAYS define models in `src/shared/models/` and export from `index.ts`
- ALWAYS close the connection on shutdown: `await sequelize.close()`
- Use `sequelize.sync({ alter: true })` in development ONLY

#### Writing data
```typescript
// INSERT
await Guild.upsert({ id: guild.id, name: guild.name });

// CREATE
await CommandLog.create({ guildId, userId, username, command, successful });

// UPDATE
await Guild.update({ prefix: '!' }, { where: { id: guildId } });

// FIND
const guild = await Guild.findByPk(guildId);
const logs = await CommandLog.findAll({ order: [['createdAt', 'DESC']], limit: 20 });
```

### 4. Discord.js Rules
- Use `ChatInputCommandInteraction` for slash command typing (NOT the base `CommandInteraction`)
- Register commands with `pnpm deploy-commands` after adding/changing slash commands
- ALWAYS handle errors in `interactionCreate` — a thrown error crashes the event loop
- ALWAYS provide both `reply` and `followUp` fallbacks when the interaction may be deferred
- Use `ephemeral: true` for error replies so only the user sees them

### 5. Graceful Shutdown — MANDATORY
Both entry points (`src/bot/index.ts` and `src/dashboard/index.ts`) MUST handle:
```typescript
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
```
And close Sequelize before exiting: `await sequelize.close()`

### 6. Git Workflow — Branch FIRST
- ALWAYS check `git branch --show-current` before editing files
- If on `main`, create a feature branch: `git checkout -b feat/<task-name>`
- Branch naming: `feat/`, `fix/`, `docs/`, `refactor/`, `chore/`

### 7. Quality Gates
- No file > 300 lines (split if larger)
- No function > 50 lines (extract helpers)
- `pnpm typecheck` must pass
- `pnpm test:unit` must pass before committing

---

## Environment Setup (First Run)

```bash
# 1. Copy .env.example → .env and fill in values
cp .env.example .env

# 2. Install dependencies
pnpm install

# 3. Start PostgreSQL (Docker)
docker compose up postgres -d

# 4. Sync database schema
pnpm db:sync

# 5. Register slash commands
pnpm deploy-commands

# 6. Start development
pnpm dev
```

---

## When Something Seems Wrong

- Bot not responding? → Check `DISCORD_TOKEN` in `.env`
- Commands not showing? → Run `pnpm deploy-commands` (guild deployment is instant; global takes ~1h)
- Database errors? → Verify `DATABASE_URL` and that PostgreSQL is running
- OAuth not working? → Verify `DISCORD_CLIENT_SECRET` and `DISCORD_CALLBACK_URL` match your Discord app settings
- Sessions not persisting? → Verify `SESSION_SECRET` is set and PostgreSQL session table exists
