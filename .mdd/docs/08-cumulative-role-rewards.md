---
id: 08-cumulative-role-rewards
title: Cumulative Role Rewards
edition: Both
depends_on: [01-leveling-system, 07-plugin-system]
source_files:
  - src/shared/models/LevelRole.ts
  - src/bot/events/messageCreate.ts
  - src/dashboard/app/(admin)/dashboard/plugins/leveling/page.tsx
  - src/dashboard/app/api/v1/guilds/[id]/plugins/leveling/roles/route.ts
routes:
  - GET  /api/v1/guilds/:id/plugins/leveling/roles
  - PUT  /api/v1/guilds/:id/plugins/leveling/roles
models:
  - level_roles (add cumulative column)
test_files:
  - tests/unit/cumulative-role-rewards.test.ts
known_issues: []
---

# 08 -- Cumulative Role Rewards

## Purpose

Add a per-role-reward "cumulative" toggle to the leveling plugin. By default, role rewards are **non-cumulative**: when a user earns a new role reward, all previous non-cumulative role rewards are removed. Role rewards marked **cumulative** persist through all level-ups.

This gives guild admins fine-grained control: progression roles (Bronze -> Silver -> Gold) can replace each other, while milestone roles ("Reached Level 50!") can stack.

## Architecture

The feature touches four layers:

1. **Database** -- add `cumulative` BOOLEAN column to `level_roles` table
2. **API** -- GET/PUT endpoints include the `cumulative` field
3. **Dashboard UI** -- checkbox per role reward in the existing table
4. **Bot logic** -- `awardRoleRewards()` removes non-cumulative roles below the highest earned

No new endpoints are needed; the existing GET/PUT role reward endpoints are extended.

## Data Model

### `level_roles` table (modified)

| Column     | Type        | Default | Notes                          |
|------------|-------------|---------|--------------------------------|
| guildId    | STRING(20)  | --      | PK, FK to guilds               |
| level      | INTEGER     | --      | PK, level threshold            |
| roleId     | STRING(20)  | --      | Discord role snowflake          |
| cumulative | BOOLEAN     | false   | If true, role persists forever  |
| createdAt  | DATE        | --      | Sequelize timestamp             |
| updatedAt  | DATE        | --      | Sequelize timestamp             |

## API Endpoints

### GET /api/v1/guilds/:id/plugins/leveling/roles

**Response shape changes:**

```json
[
  { "level": 5, "roleId": "123456", "cumulative": false },
  { "level": 10, "roleId": "789012", "cumulative": true }
]
```

### PUT /api/v1/guilds/:id/plugins/leveling/roles

**Request body changes:**

```json
{
  "roles": [
    { "level": 5, "roleId": "123456", "cumulative": false },
    { "level": 10, "roleId": "789012", "cumulative": true }
  ]
}
```

- `cumulative` is optional in the request; defaults to `false` if omitted
- All existing validations still apply (max 25, level 1-100, no duplicates)

**Retroactive enforcement on save:** After persisting role mappings, the PUT endpoint triggers a background cleanup. For each non-cumulative role where users have surpassed its level, the role is removed via the Discord REST API using the bot token. This runs asynchronously (fire-and-forget) so the PUT response is not delayed.

## Business Rules

1. **Default is non-cumulative.** New role rewards default to `cumulative: false`.
2. **Non-cumulative removal:** When a user levels up and earns a new role reward, ALL non-cumulative role rewards below the user's highest earned non-cumulative level are removed.
3. **Cumulative roles are never removed** by the leveling system, regardless of what other roles are earned.
4. **Mixed behavior:** A guild can have both cumulative and non-cumulative role rewards. They are independent -- only non-cumulative roles participate in the "replace" logic.
5. **Retroactive on config save:** When an admin saves role rewards and a previously-cumulative role is now non-cumulative, users who have surpassed that level lose the role. This cleanup runs asynchronously via Discord REST API.
6. **Rate-limit safety:** Retroactive cleanup processes members in batches to avoid Discord API rate limits. Failures are logged but do not block the save.

### Example scenario

Config: Level 5 = Bronze (non-cumulative), Level 10 = Silver (non-cumulative), Level 15 = Veteran (cumulative)

- User reaches level 5: gets Bronze
- User reaches level 10: gets Silver, loses Bronze
- User reaches level 15: gets Veteran, loses Silver (but keeps Veteran forever)
- User reaches level 20 (no role reward): still has Veteran only

## Dependencies

- **01-leveling-system:** XP, leveling formula, role reward infrastructure
- **07-plugin-system:** Plugin enable/disable, config management, cache refresh

## Known Issues

(none)
