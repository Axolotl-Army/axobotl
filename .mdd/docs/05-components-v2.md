---
id: 05-components-v2
title: Discord Components V2 Bot Output Redesign
edition: Bot
depends_on: [01-leveling-system]
source_files:
  - src/bot/commands/leaderboard.ts
  - src/bot/commands/help.ts
  - src/bot/commands/rank.ts
  - src/bot/commands/ping.ts
  - src/bot/commands/xp.ts
  - src/bot/commands/levelconfig.ts
  - src/bot/events/interactionCreate.ts
  - src/bot/utils/componentBuilders.ts
routes: []
models: []
test_files:
  - tests/unit/leaderboard-v2.test.ts
  - tests/unit/component-builders.test.ts
known_issues: []
---

# 05 -- Discord Components V2 Bot Output Redesign

## Purpose

Migrate all bot slash command outputs from legacy EmbedBuilder-based responses to Discord Components V2 (ContainerBuilder, TextDisplayBuilder, SectionBuilder, SeparatorBuilder). This provides a modern, visually rich experience with native interactive buttons for pagination and navigation.

## Architecture

All commands will use Components V2 (`MessageFlags.IsComponentsV2`) for their responses. A shared utility module (`src/bot/utils/componentBuilders.ts`) provides reusable builder helpers for consistent styling across commands. The `interactionCreate` event handler is extended to route `isButton()` interactions to command-specific button handlers.

```
User clicks /leaderboard
  -> interactionCreate (isChatInputCommand)
  -> leaderboard.execute()
  -> Builds Components V2 response (Container + TextDisplay + ActionRow buttons)
  -> User clicks "Next Page" button
  -> interactionCreate (isButton)
  -> leaderboard.handleButton()
  -> Updates message with new page
```

## Component Design

### Leaderboard (`/leaderboard`)

**Layout:**
```
[Container (accent: 0x5865F2)]
  TextDisplay: "# XP Leaderboard"
  Separator (small)
  TextDisplay: "**1.** @User -- Level 5 (1,234 XP)"
  TextDisplay: "**2.** @User -- Level 4 (987 XP)"
  ... (10 entries per page)
  Separator (small)
  TextDisplay: "Page 1 of 5"
  ActionRow:
    [<< First] [< Prev] [My Rank] [Next >] [Last >>]
```

- 10 entries per page
- Numbered list with rank position (absolute, not per-page)
- Footer shows "Page X of Y"
- "My Rank" button jumps to the page containing the invoking user's rank
- "My Rank" button is disabled if user has 0 XP
- All buttons disabled after 300s timeout
- All buttons disabled on final message update after collector ends

**Button custom IDs:** `lb:<action>:<userId>:<guildId>`
- Actions: `first`, `prev`, `next`, `last`, `myrank`

### Help (`/help`)

**Layout:**
```
[Container (accent: 0x5865F2)]
  TextDisplay: "# Axobotl -- Commands"
  Separator (small)
  Section: "/ping" text + "Check bot latency" description
  Section: "/help" text + "Show this help message" description
  Section: "/rank" text + "Check your XP rank" description
  Section: "/leaderboard" text + "Top XP earners" description
  Section: "/xp" text + "Admin: set user XP" description
  Section: "/levelconfig" text + "Admin: configure levels" description
```

- Ephemeral response (only visible to invoking user)
- No pagination needed (static list)

### Rank (`/rank`)

**Layout:**
```
[Container (accent: 0x5865F2)]
  Section:
    TextDisplay: "# @User"
    TextDisplay: "Level 5"
    ThumbnailAccessory: user avatar
  Separator (small)
  TextDisplay: "**Total XP:** 1,234"
  TextDisplay: "**Guild Rank:** #3"
  TextDisplay: "**Progress to Level 6:** 234 / 500 XP"
```

- Uses SectionBuilder with ThumbnailAccessory for user avatar
- No buttons needed

### Ping (`/ping`)

**Layout:**
```
[Container (accent: 0x5865F2)]
  TextDisplay: "# Pong!"
  TextDisplay: "**Bot latency:** 42ms"
  TextDisplay: "**API latency:** 100ms"
```

- Simple, minimal layout

### XP (`/xp`)

**Layout:**
```
[Container (accent: 0x5865F2)]
  TextDisplay: "# XP Updated"
  TextDisplay: "**User:** @User"
  TextDisplay: "**New XP:** 500"
  TextDisplay: "**New Level:** 3"
```

- Admin confirmation response

### Levelconfig (`/levelconfig`)

**Layout:**
```
[Container (accent: 0x5865F2)]
  TextDisplay: "# Level Configuration Updated"
  TextDisplay: "<confirmation details per subcommand>"
```

- Admin confirmation response

## Button Interaction Handling

The `interactionCreate` handler must be updated to handle `isButton()`:

1. Parse `customId` to extract command prefix and action
2. Route to the appropriate command's `handleButton()` method
3. Use `interaction.update()` to edit the existing message (no new reply)

### Collector Pattern

Each paginated command uses `createMessageComponentCollector` on the reply message:
- **Filter:** Only the original invoking user can interact
- **Time:** 300,000ms (5 minutes)
- **On collect:** Update message with new page
- **On end:** Edit message with all buttons disabled

## Shared Utilities (`src/bot/utils/componentBuilders.ts`)

```typescript
// createContainer(accentColor?) - ContainerBuilder with default accent
// createTitle(text) - TextDisplay with markdown heading
// createSeparator() - Standard small separator
// createPageFooter(page, totalPages) - "Page X of Y" TextDisplay
// disableAllButtons(actionRow) - Returns new ActionRow with all buttons disabled
```

## Business Rules

- Only the user who invoked the command can interact with pagination buttons
- Buttons expire after 300 seconds of inactivity
- When buttons expire, the message is updated to show disabled buttons
- "My Rank" button is disabled when the invoking user has 0 XP in the guild
- Leaderboard only shows users with XP > 0
- Page count is calculated as ceil(totalUsersWithXP / 10)
- If the current page exceeds total pages (e.g. data changed), clamp to last page

## Dependencies

- 01-leveling-system (UserLevel model for leaderboard/rank data)
- discord.js ^14.16.3 (Components V2 support)
