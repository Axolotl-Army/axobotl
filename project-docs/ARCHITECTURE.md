# Architecture — Axobotl

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            axobotl                                  │
│                                                                     │
│   Discord Gateway                                                   │
│   ┌─────────────┐   WebSocket    ┌──────────────────────────────┐  │
│   │   Discord   │<─────────────->│       Bot Service            │  │
│   │   API/GW    │  slash cmds    │  src/bot/index.ts            │  │
│   └─────────────┘                │  events: ready, interaction, │  │
│                                  │          guildCreate         │  │
│                                  │  commands: /ping, /help      │  │
│                                  └──────────────┬───────────────┘  │
│                                                 │                  │
│   Browser                                       │ Sequelize        │
│   ┌─────────────┐   HTTP :3000   ┌─────────────┴──────────────┐   │
│   │    User     │<─────────────->│     Dashboard Service       │   │
│   │   Browser   │   EJS views    │  src/dashboard/index.ts     │   │
│   └─────────────┘                │  Express + Passport.js      │   │
│                                  │  Session store (PostgreSQL)  │   │
│                                  └──────────────┬──────────────┘   │
│                                                 │                  │
│                                        read/write│                  │
│                                                 ▼                  │
│                                  ┌──────────────────────────────┐  │
│                                  │       Shared Models          │  │
│                                  │  src/shared/models/          │  │
│                                  │  Guild, CommandLog           │  │
│                                  │  (Sequelize ORM)             │  │
│                                  └──────────────┬───────────────┘  │
│                                                 │                  │
│                                                 ▼                  │
│                                  ┌──────────────────────────────┐  │
│                                  │        PostgreSQL 16          │  │
│                                  │        Port: 5432            │  │
│                                  │  tables: guilds,             │  │
│                                  │          command_logs        │  │
│                                  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Service Responsibilities

| Service | Process | Entry Point | Responsibilities |
|---|---|---|---|
| Bot | `src/bot/index.ts` | discord.js Client | Handle slash commands, log to DB, upsert guilds on join |
| Dashboard | `src/dashboard/index.ts` | Express :3000 | Serve EJS views, Discord OAuth2, REST API v1 |
| Shared | `src/shared/` | (imported by both) | Sequelize instance, Guild + CommandLog models |

## Data Flow

1. **Bot** — Connects via Discord Gateway (WebSocket); on slash command, executes handler and writes `CommandLog` row; on `guildCreate`, upserts `Guild` row.
2. **Dashboard** — User visits `/login` → Discord OAuth2 redirect → `/auth/callback` → session stored in PostgreSQL → protected views query `Guild` and `CommandLog` via Sequelize.
3. **Shared models** — `Guild` and `CommandLog` defined once in `src/shared/models/`, imported by both services.

## API Routes

```
Routes Map
==========

  /auth/
  ├── GET    /discord           → passport.authenticate('discord')
  ├── GET    /callback          → OAuth2 callback, redirect to /dashboard
  └── POST   /logout            → req.logout(), redirect to /

  /
  ├── GET    /                  → redirect to /dashboard or /login
  ├── GET    /login             → render login view
  ├── GET    /health            → { status: 'ok', timestamp }
  │
  ├── GET    /dashboard         → [auth] overview: guildCount, totalCommands, recentLogs
  ├── GET    /dashboard/commands→ [auth] command stats grouped by name
  └── GET    /dashboard/logs    → [auth] paginated command_logs (20/page)

  /api/v1/
  ├── GET    /stats             → [auth] { guildCount, totalCommands }
  └── GET    /guilds            → [auth] all guilds ordered by name

  [auth] = requireAuth middleware (redirect to /login if unauthenticated)
```

## Bot Commands

| Command | Description | Response |
|---|---|---|
| `/ping` | Check bot latency | Bot latency + API latency (ms) |
| `/help` | List available commands | Ephemeral embed with command list |

## Bot Events

| Event | Handler | Action |
|---|---|---|
| `ready` (once) | `src/bot/events/ready.ts` | Log startup, register slash commands to guild/global |
| `interactionCreate` | `src/bot/events/interactionCreate.ts` | Route to command handler, log result to DB |
| `guildCreate` | `src/bot/events/guildCreate.ts` | Upsert Guild record in DB |

## Database Schema

```
  ┌──────────────────────────────┐
  │           guilds             │
  ├──────────────────────────────┤
  │ id           VARCHAR(20) PK  │  ← Discord guild snowflake
  │ name         VARCHAR(100)    │
  │ prefix       VARCHAR(10)     │  default: '!'
  │ logsChannelId VARCHAR(20)    │  nullable
  │ language     VARCHAR(10)     │  default: 'en'
  │ createdAt    TIMESTAMPTZ     │
  │ updatedAt    TIMESTAMPTZ     │
  └──────────────┬───────────────┘
                 │ hasMany
                 │
  ┌──────────────▼───────────────┐
  │         command_logs         │
  ├──────────────────────────────┤
  │ id           SERIAL     PK   │
  │ guildId      VARCHAR(20) FK  │  → guilds.id
  │ userId       VARCHAR(20)     │  Discord user snowflake
  │ username     VARCHAR(100)    │
  │ command      VARCHAR(100)    │
  │ successful   BOOLEAN         │  default: true
  │ createdAt    TIMESTAMPTZ     │
  └──────────────────────────────┘
```

## Auth Flow (Dashboard)

```
User → GET /login → GET /auth/discord → Discord OAuth2 → GET /auth/callback
     → session created (PostgreSQL) → GET /dashboard
```

## Changelog

| Date | Change |
|---|---|
| 2026-03-08 | Updated all diagrams from code scan (architecture, API routes, database schema) |
