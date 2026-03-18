---
id: 06-guild-config
title: Guild Configuration Dashboard + Bot Improvements
edition: Both
depends_on: [01-leveling-system, 02-dashboard-nextjs-migration, 05-components-v2]
source_files:
  - src/shared/models/Guild.ts
  - src/bot/commands/leaderboard.ts
  - src/bot/commands/help.ts
  - src/bot/events/messageCreate.ts
  - src/dashboard/app/(admin)/dashboard/settings/page.tsx
  - src/dashboard/app/api/v1/guilds/[id]/route.ts
  - src/dashboard/lib/db.ts
  - src/dashboard/layouts/components/data.ts
routes:
  - GET /api/v1/guilds/:id
  - PATCH /api/v1/guilds/:id
models:
  - guilds (add levelUpChannelId column)
test_files:
  - tests/unit/bot/commands/leaderboard.test.ts
  - tests/unit/bot/commands/help.test.ts
  - tests/unit/dashboard/api/guild-config.test.ts
known_issues: []
---

# 06 -- Guild Configuration Dashboard + Bot Improvements

## Purpose

Three changes in one feature:

1. **Leaderboard timeout**: Remove buttons entirely after 5-minute timeout instead of disabling them.
2. **Help command**: Hide admin-only commands (/xp, /levelconfig) from the /help output.
3. **Dashboard config page**: New guild configuration page that shows all configurable guild settings. Initial fields: level-up channel (same channel vs specific channel), level-up message template, and language. The page is designed with an extensible card-based layout so future config options can be added easily.

## Architecture

### Bot changes (leaderboard + help)

Simple modifications to existing command files. No new files needed.

### Dashboard config page

```
/dashboard/config
  -> Guild selector dropdown (owner's guilds only, cross-ref with Discord API)
  -> Card-based settings layout:
     [Leveling Card]
       - Level-up channel: toggle (same channel / specific channel) + channel ID input
       - Level-up message template: text input with placeholder preview
     [General Card]
       - Language: dropdown
  -> Save button per card (PATCH /api/v1/guilds/:id)
```

### Level-up channel routing (bot)

When a user levels up in messageCreate:
- If `guild.levelUpChannelId` is set and the channel exists, post there
- Otherwise, post in the same channel as the triggering message (current behavior)

## Data Model

### Guild table -- add column

```
levelUpChannelId  VARCHAR(20)  nullable, default null
  -- Discord channel snowflake for level-up notifications
  -- null = post in same channel as triggering message
```

## API Endpoints

### GET /api/v1/guilds/:id

- **Auth**: requireOwner
- **Response**: `{ id, name, language, levelUpMessage, levelUpChannelId, logsChannelId, createdAt, updatedAt }`
- **Errors**: 401 (not authenticated), 403 (not owner), 404 (guild not found)

### PATCH /api/v1/guilds/:id

- **Auth**: requireOwner
- **Body**: `{ language?, levelUpMessage?, levelUpChannelId? }`
  - `levelUpChannelId` accepts a channel ID string or `null` to reset to "same channel"
  - `levelUpMessage` accepts a template string or `null` to reset to default
  - `language` accepts a language code string
- **Validation**: levelUpMessage max 500 chars, language max 10 chars, levelUpChannelId max 20 chars
- **Response**: updated guild object
- **Errors**: 401, 403, 404, 400 (validation)

## Business Rules

### Leaderboard
- On collector `end` event: edit reply with only the container (no ActionRow), removing buttons entirely

### Help command
- Only show non-admin commands: /ping, /help, /rank, /leaderboard
- Admin commands (/xp, /levelconfig) are hidden from the list

### Level-up channel
- If `levelUpChannelId` is set, bot attempts to send in that channel
- If the channel doesn't exist or bot lacks permissions, fall back to the message channel
- Dashboard shows a toggle: "Same channel as message" vs "Specific channel" with an input

### Dashboard guild selector
- Fetch guilds from the API that match the owner's Discord guilds
- The owner's guilds come from the Discord API via the stored access token or from the bot's guild list filtered by owner

## Dependencies

- 01-leveling-system (UserLevel model, level-up notifications)
- 02-dashboard-nextjs-migration (Next.js dashboard infrastructure)
- 05-components-v2 (Components V2 for bot outputs)
