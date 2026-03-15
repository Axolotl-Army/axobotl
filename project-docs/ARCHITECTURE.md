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
│                                  │          guildCreate,        │  │
│                                  │          messageCreate       │  │
│                                  │  commands: /ping, /help,     │  │
│                                  │    /rank, /leaderboard,      │  │
│                                  │    /xp, /levelconfig         │  │
│                                  └──────────────┬───────────────┘  │
│                                                 │                  │
│   Browser                                       │ Sequelize        │
│   ┌─────────────┐   HTTP :3000   ┌─────────────┴──────────────┐   │
│   │    User     │<─────────────->│     Dashboard Service       │   │
│   │   Browser   │  Next.js 15    │  src/dashboard/             │   │
│   └─────────────┘                │  NextAuth.js (Discord OAuth) │   │
│                                  │  JWT sessions               │   │
│                                  └──────────────┬──────────────┘   │
│                                                 │                  │
│                                        read/write│                  │
│                                                 ▼                  │
│                                  ┌──────────────────────────────┐  │
│                                  │       Shared Models          │  │
│                                  │  src/shared/models/          │  │
│                                  │  Guild, CommandLog,          │  │
│                                  │  UserLevel (Sequelize ORM)   │  │
│                                  └──────────────┬───────────────┘  │
│                                                 │                  │
│                                                 ▼                  │
│                                  ┌──────────────────────────────┐  │
│                                  │        PostgreSQL 16          │  │
│                                  │        Port: 5432            │  │
│                                  │  tables: guilds,             │  │
│                                  │          command_logs,       │  │
│                                  │          user_levels         │  │
│                                  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Service Responsibilities

| Service | Process | Entry Point | Responsibilities |
|---|---|---|---|
| Bot | `src/bot/index.ts` | discord.js Client | Handle slash commands, log to DB, upsert guilds on join, track XP |
| Dashboard | `src/dashboard/` | Next.js 15 App Router :3000 | Serve admin UI, Discord OAuth2 (NextAuth.js), REST API v1 |
| Shared | `src/shared/` | (imported by both) | Sequelize instance, Guild + CommandLog + UserLevel models |

## Data Flow

1. **Bot** — Connects via Discord Gateway (WebSocket); on slash command, executes handler and writes `CommandLog` row; on `guildCreate`, upserts `Guild` row; on `messageCreate`, awards XP and updates `UserLevel`.
2. **Dashboard** — User visits `/auth/login` → Discord OAuth2 → NextAuth.js callback → JWT session → protected pages/API routes query models via lazy `src/dashboard/lib/db.ts` imports.
3. **Shared models** — `Guild`, `CommandLog`, and `UserLevel` defined once in `src/shared/models/`, imported by both services.

## API Routes

```
Routes Map
==========

  /api/auth/
  └── */[...nextauth]           → NextAuth.js handler (Discord OAuth2)

  /api/
  └── GET  /health              → { status: 'ok', timestamp }  (no auth)

  /api/v1/                      [requireOwner — 401/403 if not BOT_OWNER_ID]
  ├── GET    /stats             → { guildCount, totalCommands }
  ├── GET    /guilds            → all guilds ordered by name
  ├── GET    /logs              → paginated command_logs (page, limit params)
  └── GET    /commands          → command stats grouped by command name

  Dashboard Pages (Next.js App Router)
  /auth/login                   → Discord OAuth2 login page (Vanta.js bg)
  /dashboard                    → [auth] overview stats + recent logs
  /dashboard/commands           → [auth] command usage stats
  /dashboard/logs               → [auth] paginated command log browser

  [auth] = NextAuth session check in (admin) layout, redirect to /auth/login
```

## Bot Commands

| Command | Description | Response |
|---|---|---|
| `/ping` | Check bot latency | Bot latency + API latency (ms) |
| `/help` | List available commands | Ephemeral embed with command list |
| `/rank` | Show your XP rank in the server | Embed with level, XP, rank position |
| `/leaderboard` | Show top users by XP | Paginated embed of top XP earners |
| `/xp` | Admin: manually set a user's XP | Confirmation of XP update |
| `/levelconfig` | Admin: configure level-up settings | Confirmation of config update |

## Bot Events

| Event | Handler | Action |
|---|---|---|
| `ready` (once) | `src/bot/events/ready.ts` | Log startup, register slash commands to guild/global |
| `interactionCreate` | `src/bot/events/interactionCreate.ts` | Route to command handler, log result to DB |
| `guildCreate` | `src/bot/events/guildCreate.ts` | Upsert Guild record in DB |
| `messageCreate` | `src/bot/events/messageCreate.ts` | Award XP on messages, check level-up |

## Database Schema

```
  ┌──────────────────────────────┐
  │           guilds             │
  ├──────────────────────────────┤
  │ id             VARCHAR(20) PK│  ← Discord guild snowflake
  │ name           VARCHAR(100)  │
  │ prefix         VARCHAR(10)   │  default: '!'
  │ logsChannelId  VARCHAR(20)   │  nullable
  │ language       VARCHAR(10)   │  default: 'en'
  │ levelUpMessage VARCHAR(500)  │  nullable, custom level-up template
  │ createdAt      TIMESTAMPTZ   │
  │ updatedAt      TIMESTAMPTZ   │
  └────────────┬─────────────────┘
               │ hasMany
               │
  ┌────────────▼─────────────────┐     ┌──────────────────────────────┐
  │         command_logs         │     │          user_levels         │
  ├──────────────────────────────┤     ├──────────────────────────────┤
  │ id         SERIAL       PK   │     │ guildId    VARCHAR(20)  PK   │
  │ guildId    VARCHAR(20)  FK   │     │ userId     VARCHAR(20)  PK   │
  │            → guilds.id       │     │ xp         INTEGER           │  default: 0
  │ userId     VARCHAR(20)       │     │ level      INTEGER           │  default: 0
  │ username   VARCHAR(100)      │     │ lastXpAt   TIMESTAMPTZ       │  nullable
  │ command    VARCHAR(100)      │     │ createdAt  TIMESTAMPTZ       │
  │ successful BOOLEAN           │     │ updatedAt  TIMESTAMPTZ       │
  │            default: true     │     │ INDEX: (guildId, xp)         │
  │ createdAt  TIMESTAMPTZ       │     └──────────────────────────────┘
  └──────────────────────────────┘
```

## Auth Flow (Dashboard)

```
User → GET /auth/login → signIn('discord') → Discord OAuth2
     → NextAuth callback → JWT session cookie → GET /dashboard
     → (admin) layout checks session → redirect to /auth/login if unauth
     → API routes call requireOwner() → 401/403 if not BOT_OWNER_ID
```

## Changelog

| Date | Change |
|---|---|
| 2026-03-08 | Updated all diagrams from code scan (architecture, API routes, database schema) |
| 2026-03-15 | Updated all diagrams from code scan (Next.js dashboard, UserLevel model, new commands, revised API routes and auth flow) |
