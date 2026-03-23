---
id: 09-default-embed-colour
title: Default Embed Colour
edition: Both
depends_on: [06-guild-config]
source_files:
  - src/shared/models/Guild.ts
  - src/dashboard/app/(admin)/dashboard/settings/page.tsx
  - src/dashboard/app/api/v1/guilds/[id]/route.ts
  - src/bot/utils/embedUtils.ts
routes:
  - PATCH /api/v1/guilds/:id (add embedColor field)
models:
  - guilds (add embedColor column)
test_files:
  - tests/unit/default-embed-colour.test.ts
known_issues: []
---

# 09 -- Default Embed Colour

## Purpose

Allow guild owners to set a default embed colour from the dashboard General Settings page. The bot uses this colour as a fallback when no command or feature specifies an explicit embed colour.

## Architecture

The embed colour is stored as a nullable hex string on the `guilds` table. The dashboard settings page adds a colour picker card with preset swatches for common Discord colours plus a free-form hex input. On the bot side, a helper function reads the guild's `embedColor` and returns a resolved colour number for use with `EmbedBuilder.setColor()`.

```
Dashboard Settings Page
  -> PATCH /api/v1/guilds/:id { embedColor: "#5865F2" }
  -> Guild model (embedColor column)

Bot embed creation
  -> getEmbedColor(guildId) helper
  -> returns guild.embedColor parsed to number, or DEFAULT_EMBED_COLOR
```

## Data Model

**guilds table -- new column:**

| Column     | Type        | Nullable | Default | Notes                        |
|------------|-------------|----------|---------|------------------------------|
| embedColor | STRING(7)   | yes      | null    | Hex colour e.g. "#5865F2"   |

When `null`, the bot uses a built-in default colour.

## API Endpoints

### PATCH /api/v1/guilds/:id (existing -- add field)

**New field in request body:**
- `embedColor` (string | null) -- 7-char hex colour string (#RRGGBB) or null to reset

**Validation:**
- Must be null, or a string matching `/^#[0-9A-Fa-f]{6}$/`
- Max length: 7 characters

**Response:** Updated guild object (unchanged shape, new field included)

## Business Rules

1. `embedColor` is optional -- guilds that never set it get `null` (use bot default)
2. Setting `embedColor` to `null` or empty string resets to default
3. The colour picker UI shows preset swatches: Discord Blurple (#5865F2), Green (#57F287), Yellow (#FEE75C), Fuchsia (#EB459E), Red (#ED4245), White (#FFFFFF), plus a free-form hex picker
4. The bot helper `getEmbedColor(guildId)` returns the guild colour as a number, or the bot default if null
5. The bot default colour is `#5865F2` (Discord Blurple)

## Dependencies

- **06-guild-config** -- extends the existing guild settings page and PATCH endpoint

## Known Issues

(none)
