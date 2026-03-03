# Architecture — Axobotl

## Overview

Axobotl is a Discord bot with a web management dashboard, structured as two separate Node.js processes sharing a PostgreSQL database via Sequelize.

## Services

```
┌─────────────────────────────────────────┐
│                axobotl                  │
│                                         │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │  Bot Service │  │ Dashboard Service│ │
│  │  discord.js  │  │  Express + EJS   │ │
│  │   Port: N/A  │  │  Port: 3000      │ │
│  └──────┬───────┘  └────────┬─────────┘ │
│         │                   │           │
│         └─────────┬─────────┘           │
│                   │                     │
│          ┌────────▼────────┐            │
│          │ Shared Models   │            │
│          │   (Sequelize)   │            │
│          └────────┬────────┘            │
│                   │                     │
│          ┌────────▼────────┐            │
│          │   PostgreSQL    │            │
│          │   Port: 5432    │            │
│          └─────────────────┘            │
└─────────────────────────────────────────┘
```

## Data Flow

1. **Bot** — Receives Discord gateway events, executes slash commands, logs to PostgreSQL
2. **Dashboard** — Express server serves EJS views; users authenticate via Discord OAuth2
3. **Shared models** — `Guild` and `CommandLog` are defined once and used by both services

## Database Schema

### guilds
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(20) | Discord guild snowflake, PK |
| name | VARCHAR(100) | Guild display name |
| prefix | VARCHAR(10) | Legacy prefix (default `!`) |
| logsChannelId | VARCHAR(20) | Channel for bot activity logs |
| language | VARCHAR(10) | Locale code (default `en`) |
| createdAt, updatedAt | TIMESTAMPTZ | Auto-managed |

### command_logs
| Column | Type | Notes |
|---|---|---|
| id | SERIAL | Auto-increment PK |
| guildId | VARCHAR(20) | FK → guilds.id |
| userId | VARCHAR(20) | Discord user snowflake |
| username | VARCHAR(100) | User's display tag |
| command | VARCHAR(100) | Slash command name |
| successful | BOOLEAN | Whether execution succeeded |
| createdAt | TIMESTAMPTZ | Auto-managed |

## Auth Flow (Dashboard)

```
User → /auth/discord → Discord OAuth2 → /auth/callback → session → /dashboard
```
