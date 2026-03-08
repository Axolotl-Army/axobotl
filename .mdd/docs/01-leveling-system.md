---
id: 01-leveling-system
title: Leveling System
edition: Bot
depends_on: []
source_files:
  - src/shared/models/UserLevel.ts
  - src/shared/models/Guild.ts (modified — adds levelUpMessage field)
  - src/shared/models/index.ts (modified — exports UserLevel)
  - src/bot/utils/levelUtils.ts
  - src/bot/events/messageCreate.ts
  - src/bot/commands/rank.ts
  - src/bot/commands/leaderboard.ts
  - src/bot/commands/xp.ts
  - src/bot/commands/levelconfig.ts
  - src/bot/index.ts (modified — registers new commands and messageCreate event)
routes: []
models:
  - user_levels
  - guilds (modified)
test_files:
  - tests/unit/leveling.test.ts
known_issues: []
---

# 01 — Leveling System

## Purpose

Awards XP to guild members for sending messages, with a 60-second cooldown to prevent spam. Members accumulate XP and advance through levels according to an exponential curve. A leaderboard and rank commands let users see their standing, while admins can manage XP and customise the level-up notification message.

## Architecture

```
messageCreate event
       │
       ▼
messageCreate.ts (event handler)
       │  checks cooldown (in-memory Map)
       │  awards random 7–13 XP
       │  updates UserLevel row
       │  checks for level-up
       ▼
levelUtils.ts (pure functions)
       │  getLevelFromXp(xp)
       │  getXpForLevel(level)
       │  formatLevelUpMessage(template, user, level)
       ▼
UserLevel model (PostgreSQL)

Slash commands (rank, leaderboard, xp, levelconfig)
       │
       ▼
UserLevel / Guild models
```

## Data Model

### user_levels

| Column     | Type          | Notes                                    |
|------------|---------------|------------------------------------------|
| guildId    | VARCHAR(20)   | Discord guild snowflake, composite PK    |
| userId     | VARCHAR(20)   | Discord user snowflake, composite PK     |
| xp         | INTEGER       | Total accumulated XP, default 0          |
| level      | INTEGER       | Current level (derived, cached), default 0 |
| lastXpAt   | TIMESTAMPTZ   | Timestamp of last XP award, nullable     |
| createdAt  | TIMESTAMPTZ   | Auto-managed                             |
| updatedAt  | TIMESTAMPTZ   | Auto-managed                             |

Index: `(guildId, xp DESC)` for leaderboard queries.

### guilds (modified)

New field added:

| Column         | Type          | Notes                                        |
|----------------|---------------|----------------------------------------------|
| levelUpMessage | VARCHAR(500)  | Custom level-up template, nullable (uses default when null) |

## Leveling Formula

```
Total XP required for level L = 50 × L^1.7385
```

Example thresholds:
- Level 1:  50 XP
- Level 2:  167 XP
- Level 3:  337 XP
- Level 5:  821 XP
- Level 10: 2,739 XP

Inverse (current level from total XP):
```
currentLevel = floor((totalXp / 50)^(1 / 1.7385))
```

## XP Award Rules

- Per message: random integer in `[7, 13]` (inclusive).
- Cooldown: one award per user per guild per **60 seconds**. Messages within the cooldown window are silently ignored (no reply, no notification).
- Cooldown is tracked in an **in-memory Map** keyed by `${guildId}:${userId}`. The Map is cleared on bot restart, which is acceptable (users lose at most 60 s of cooldown state).
- Bots and webhook messages are ignored.
- DMs are ignored (only guild messages count).

## Level-up Notification

- Posted in the **same channel** where the leveling message was sent.
- Template supports two placeholders: `{user}` (Discord mention) and `{level}` (new level number).
- Default template: `"GG {user}, you reached **level {level}**!"`
- Guilds can override via `/levelconfig setmessage`.
- If the template is `null` or empty in the DB, the default is used.

## Slash Commands

### `/rank [user]`
- **Permission:** None (anyone can use).
- **Options:** `user` — optional user mention (defaults to the invoking user).
- **Response:** Embed showing the target user's level, total XP, XP needed for next level, and their rank in the guild.
- **Errors:** If the target user has no XP record, show level 0 / 0 XP.

### `/leaderboard`
- **Permission:** None (anyone can use).
- **Response:** Embed listing the top 10 guild members by XP, with rank number, username, level, and XP. If the invoking user is ranked 11th or lower, append their own rank below the top 10 list.

### `/xp add <user> <amount>`
- **Permission:** Manage Guild.
- **Options:** `user` — required user mention; `amount` — positive integer 1–100,000.
- **Behaviour:** Adds `amount` to the user's XP, recalculates level, fires level-up notification if they crossed a threshold. Replies ephemerally with the new totals.
- **Errors:** Missing permission → ephemeral error. Amount out of range → ephemeral error.

### `/xp remove <user> <amount>`
- **Permission:** Manage Guild.
- **Options:** `user` — required user mention; `amount` — positive integer 1–100,000.
- **Behaviour:** Subtracts `amount` from the user's XP (floor at 0), recalculates level. Replies ephemerally with the new totals.

### `/xp set <user> <amount>`
- **Permission:** Manage Guild.
- **Options:** `user` — required user mention; `amount` — non-negative integer 0–10,000,000.
- **Behaviour:** Sets the user's XP to exactly `amount`, recalculates level. Replies ephemerally with the new totals.

### `/levelconfig setmessage <message>`
- **Permission:** Manage Guild.
- **Options:** `message` — string up to 500 characters. Use `{user}` and `{level}` as placeholders.
- **Behaviour:** Saves the template to `guilds.levelUpMessage`. Replies ephemerally confirming the new template with a preview.
- **Reset:** Passing the literal string `reset` clears the custom message (reverts to default).

## Business Rules

1. XP cannot go below 0.
2. Level is always the computed floor from total XP — it is cached in the `level` column for fast sorting but always recalculated on write.
3. Level-up notifications fire only when the level strictly increases (not on `/xp remove` or `/xp set` that reduces XP).
4. `/xp add` can trigger multiple level-up notifications in one call if `amount` is large enough to skip levels — notify for each skipped level up to a maximum of 5 consecutive notifications; beyond that, only announce the final level to avoid flooding the channel.
5. The leaderboard only shows users who have at least 1 XP.
6. All XP management commands must validate that `amount` is a finite, positive (or non-negative for `set`) integer — reject floats or NaN.

## Dependencies

None — this is a self-contained feature.

## Known Issues

<!-- Empty — populated by future audits -->
