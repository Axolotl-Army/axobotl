---
id: 07-plugin-system
title: Plugin System
edition: Both
depends_on: [01-leveling-system, 06-guild-config]
source_files:
  # Shared models
  - src/shared/models/GuildPlugin.ts
  - src/shared/models/LevelRole.ts
  - src/shared/models/index.ts
  # Bot plugin infrastructure
  - src/bot/plugins/registry.ts
  - src/bot/plugins/pluginCache.ts
  - src/bot/plugins/commandSync.ts
  # Bot modifications
  - src/bot/index.ts
  - src/bot/events/ready.ts
  - src/bot/events/interactionCreate.ts
  - src/bot/events/messageCreate.ts
  - src/bot/events/guildCreate.ts
  - src/bot/utils/levelUtils.ts
  # Dashboard API
  - src/dashboard/app/api/v1/guilds/[id]/plugins/route.ts
  - src/dashboard/app/api/v1/guilds/[id]/plugins/[pluginId]/route.ts
  - src/dashboard/app/api/v1/guilds/[id]/plugins/leveling/roles/route.ts
  # Dashboard pages
  - src/dashboard/app/(admin)/dashboard/plugins/page.tsx
  - src/dashboard/app/(admin)/dashboard/plugins/leveling/page.tsx
  - src/dashboard/app/(admin)/dashboard/settings/page.tsx
  # Dashboard shared
  - src/dashboard/layouts/components/data.ts
  - src/dashboard/lib/db.ts
routes:
  - GET    /api/v1/guilds/:id/plugins
  - PATCH  /api/v1/guilds/:id/plugins/:pluginId
  - GET    /api/v1/guilds/:id/plugins/leveling/roles
  - PUT    /api/v1/guilds/:id/plugins/leveling/roles
models:
  - GuildPlugin
  - LevelRole
test_files:
  - tests/unit/pluginCache.test.ts
  - tests/unit/pluginRegistry.test.ts
  - tests/unit/levelRoles.test.ts
known_issues: []
---

# 07 -- Plugin System

## Purpose

A per-guild plugin system that allows bot owners to enable/disable feature bundles (starting with the leveling system). When a plugin is disabled, its slash commands are unregistered from the guild and all background behavior (XP awarding, notifications) stops. Configuration is preserved across disable/enable cycles. The dashboard provides a plugin overview grid and per-plugin configuration pages.

## Architecture

```
Dashboard                          Bot
  |                                 |
  |  PATCH /plugins/:pluginId       |
  |  (toggle enable / update cfg)   |
  |          |                      |
  |    [GuildPlugin table]          |
  |                                 |
  |                          pluginCache (TTL 60s)
  |                            reads DB periodically
  |                                 |
  |                          commandSync
  |                            re-registers guild commands
  |                            when cache detects changes
  |                                 |
  |                          interactionCreate
  |                            checks plugin state
  |                                 |
  |                          messageCreate
  |                            checks plugin state
```

### Command Registration Strategy

- **Base commands** (ping, help): Registered globally -- always visible in all guilds.
- **Plugin commands** (rank, leaderboard, xp, levelconfig): Registered per-guild only when the plugin is enabled.
- When a plugin is toggled, `commandSync` re-registers the full set of guild commands for that guild via Discord's PUT endpoint (which replaces all guild commands atomically).

### Plugin Cache

The bot uses an in-memory cache (`pluginCache`) to avoid hitting the database on every message/interaction:
- TTL: 60 seconds
- On refresh: loads all `GuildPlugin` rows, compares with previous state
- When a guild's plugin state changes: triggers `commandSync` for that guild
- Cache stores both `enabled` status and `config` per guild-plugin pair

## Data Model

### GuildPlugin

| Column    | Type         | Constraints              | Description                        |
|-----------|--------------|--------------------------|------------------------------------|
| guildId   | STRING(20)   | PK, FK -> Guild          | Discord guild snowflake            |
| pluginId  | STRING(50)   | PK                       | Plugin identifier (e.g. 'leveling')|
| enabled   | BOOLEAN      | NOT NULL, default: false | Whether the plugin is active       |
| config    | JSONB        | NOT NULL, default: {}    | Plugin-specific configuration      |
| createdAt | TIMESTAMPTZ  | auto                     |                                    |
| updatedAt | TIMESTAMPTZ  | auto                     |                                    |

**Leveling config shape** (stored in `config` JSONB):
```typescript
interface LevelingConfig {
  levelUpMessage: string | null;    // null = default message
  levelUpChannelId: string | null;  // null = same channel
  xpMin: number;                    // default: 7
  xpMax: number;                    // default: 13
  cooldownMs: number;               // default: 60000
  xpMultiplier: number;             // default: 1.0
}
```

### LevelRole

| Column    | Type         | Constraints              | Description                        |
|-----------|--------------|--------------------------|------------------------------------|
| guildId   | STRING(20)   | PK, FK -> Guild          | Discord guild snowflake            |
| level     | INTEGER      | PK                       | Level at which the role is awarded |
| roleId    | STRING(20)   | NOT NULL                 | Discord role snowflake             |
| createdAt | TIMESTAMPTZ  | auto                     |                                    |
| updatedAt | TIMESTAMPTZ  | auto                     |                                    |

### Migration

Existing data in `Guild.levelUpMessage` and `Guild.levelUpChannelId` is migrated into `GuildPlugin.config` for guilds that have non-null values. Those guilds get `enabled: true`. The columns remain on the Guild model temporarily but are no longer read by the bot or dashboard.

## API Endpoints

### GET /api/v1/guilds/:id/plugins

Returns all registered plugins with their enabled status and config for the guild.

**Auth:** requireOwner

**Response 200:**
```json
[
  {
    "id": "leveling",
    "name": "Leveling",
    "description": "Track XP from messages, level up, and earn role rewards",
    "enabled": true,
    "config": {
      "levelUpMessage": null,
      "levelUpChannelId": null,
      "xpMin": 7,
      "xpMax": 13,
      "cooldownMs": 60000,
      "xpMultiplier": 1.0
    }
  }
]
```

### PATCH /api/v1/guilds/:id/plugins/:pluginId

Toggle plugin and/or update config. Uses upsert -- creates GuildPlugin row if it doesn't exist.

**Auth:** requireOwner

**Request body:**
```json
{
  "enabled": true,
  "config": {
    "xpMin": 10,
    "xpMax": 20
  }
}
```

Both fields are optional. `config` is shallow-merged with existing config.

**Response 200:** Updated plugin object (same shape as GET list item).

**Errors:**
- 400: Invalid pluginId, config validation failure
- 404: Guild not found

### GET /api/v1/guilds/:id/plugins/leveling/roles

Returns level-role mappings for the guild, ordered by level ascending.

**Auth:** requireOwner

**Response 200:**
```json
[
  { "level": 5, "roleId": "123456789" },
  { "level": 10, "roleId": "987654321" }
]
```

### PUT /api/v1/guilds/:id/plugins/leveling/roles

Replaces all level-role mappings for the guild (delete + bulk insert).

**Auth:** requireOwner

**Request body:**
```json
{
  "roles": [
    { "level": 5, "roleId": "123456789" },
    { "level": 10, "roleId": "987654321" }
  ]
}
```

**Validation:**
- Max 25 role mappings per guild
- Level must be a positive integer (1-100)
- roleId must be a valid snowflake string (1-20 chars)
- No duplicate levels

**Response 200:** Updated roles array.

## Business Rules

### Plugin State

1. Plugins default to **disabled** when the bot joins a guild.
2. Enabling a plugin triggers guild command re-registration (within 60s cache TTL).
3. Disabling a plugin removes its commands from the guild and stops all background processing.
4. UserLevel data is **never deleted** when the leveling plugin is disabled.
5. Config values persist across enable/disable cycles.

### Bot Behavior When Plugin Disabled

1. **messageCreate**: Skip XP awarding entirely (early return after plugin check).
2. **interactionCreate**: Plugin commands won't exist in the guild (hidden). If somehow invoked (race condition during toggle), reply with ephemeral "This feature is not enabled."
3. **help command**: Only show commands for enabled plugins.

### Config Validation (Leveling)

- `xpMin`: integer, 1-100, must be <= xpMax
- `xpMax`: integer, 1-100, must be >= xpMin
- `cooldownMs`: integer, 0-300000 (0-5 minutes)
- `xpMultiplier`: number, 0.1-10.0
- `levelUpMessage`: string, max 500 chars, or null
- `levelUpChannelId`: valid snowflake string or null

### Role Rewards

When a user levels up and the new level has a configured role:
1. Bot attempts to add the role via Discord API.
2. If the bot lacks `ManageRoles` permission or the role is above the bot's highest role, log a warning and skip silently.
3. Role rewards are cumulative -- reaching level 10 also grants the level 5 role if the user doesn't already have it.

## Dependencies

- **01-leveling-system**: The leveling system becomes the first plugin. XP formula, models, and commands are preserved but wrapped in plugin infrastructure.
- **06-guild-config**: The guild config page is replaced by plugin pages + a general settings page. Guild selector pattern is reused.

## Dashboard Pages

### Plugin Overview (`/dashboard/plugins`)

- Guild selector at top (same pattern as current config page)
- Grid of plugin cards (responsive: 1-3 columns)
- Each card shows: plugin name, icon, short description, enable/disable toggle
- Toggle calls `PATCH /api/v1/guilds/:id/plugins/:pluginId` with `{ enabled: true/false }`
- Card links to plugin-specific config page

### Leveling Config (`/dashboard/plugins/leveling`)

- Guild selector at top
- Enable/disable toggle prominently at the top (same as overview toggle)
- When disabled: config fields visible but dimmed/readonly with a banner
- Sections:
  1. **Notifications**: level-up channel + message template (migrated from current LevelingCard)
  2. **XP Settings**: min/max XP per message, cooldown, multiplier
  3. **Role Rewards**: table of level-role mappings with add/remove
- Save button per section or single save for all

### General Settings (`/dashboard/settings`)

- Guild selector at top
- Language selection (migrated from current config page)
- Future: other non-plugin guild settings

### Navigation Update

Replace the current "Configuration" menu item:
```
Settings (section title)
  |- Plugins       -> /dashboard/plugins
  |- General       -> /dashboard/settings
```

The "Leveling" sub-page is accessed from the plugin overview card, not from the sidenav directly.

## Known Issues

(none -- new feature)
