---
id: 02-dashboard-nextjs-migration
title: Dashboard Next.js Migration (SmartAdmin Seed)
edition: Dashboard
depends_on: []
source_files:
  - src/dashboard/app/layout.tsx
  - src/dashboard/app/(admin)/layout.tsx
  - src/dashboard/app/(admin)/dashboard/page.tsx
  - src/dashboard/app/(admin)/dashboard/commands/page.tsx
  - src/dashboard/app/(admin)/dashboard/logs/page.tsx
  - src/dashboard/app/auth/login/page.tsx
  - src/dashboard/app/auth/layout.tsx
  - src/dashboard/app/api/auth/[...nextauth]/route.ts
  - src/dashboard/app/api/v1/stats/route.ts
  - src/dashboard/app/api/v1/guilds/route.ts
  - src/dashboard/app/api/v1/commands/route.ts
  - src/dashboard/app/api/v1/logs/route.ts
  - src/dashboard/app/not-found.tsx
  - src/dashboard/app/error.tsx
  - src/dashboard/components/PageBreadcrumb.tsx
  - src/dashboard/components/AppLogo.tsx
  - src/dashboard/components/AppWrapper.tsx
  - src/dashboard/components/BackgroundAnimation.tsx
  - src/dashboard/components/Loader.tsx
  - src/dashboard/layouts/components/topbar/index.tsx
  - src/dashboard/layouts/components/topbar/components/ProfileDropdown.tsx
  - src/dashboard/layouts/components/topbar/components/ThemeToggler.tsx
  - src/dashboard/layouts/components/topbar/components/ToggleSidenav.tsx
  - src/dashboard/layouts/components/topbar/components/ToggleMobileMenu.tsx
  - src/dashboard/layouts/components/sidenav/index.tsx
  - src/dashboard/layouts/components/sidenav/components/AppMenu.tsx
  - src/dashboard/layouts/components/Footer.tsx
  - src/dashboard/layouts/components/SettingsDrawer.tsx
  - src/dashboard/layouts/components/data.ts
  - src/dashboard/context/useLayoutContext.tsx
  - src/dashboard/helpers/index.ts
  - src/dashboard/helpers/layout.ts
  - src/dashboard/types/layout.ts
  - src/dashboard/types/index.ts
  - src/dashboard/utils/colorInit.ts
  - src/dashboard/utils/getColor.ts
  - src/dashboard/lib/auth.ts
  - src/dashboard/lib/db.ts
  - src/dashboard/next.config.ts
  - src/dashboard/tsconfig.json
  - src/dashboard/package.json
routes:
  - GET / (redirect to /dashboard)
  - GET /dashboard (overview)
  - GET /dashboard/commands (command stats)
  - GET /dashboard/logs (paginated logs)
  - GET /auth/login (Discord OAuth login)
  - GET /api/auth/[...nextauth] (NextAuth endpoints)
  - POST /api/auth/[...nextauth] (NextAuth endpoints)
  - GET /api/v1/stats (JSON stats)
  - GET /api/v1/guilds (JSON guilds)
  - GET /api/v1/commands (JSON command stats grouped by command)
  - GET /api/v1/logs (JSON logs, paginated with ?page=N&limit=N)
models:
  - Guild (existing, shared)
  - CommandLog (existing, shared)
test_files:
  - tests/e2e/dashboard.spec.ts
known_issues: []
---

# 02 -- Dashboard Next.js Migration (SmartAdmin Seed)

## Purpose

Replace the Express + EJS dashboard with a Next.js 15 + React 19 application using the SmartAdmin seed framework. This gives us a modern React-based dashboard with the SmartAdmin Lunar theme, component library, and layout system while preserving all existing functionality: Discord OAuth login, overview stats, command statistics, and paginated logs.

## Architecture

The dashboard becomes a standalone Next.js application under `src/dashboard/`. It uses:

- **Next.js 15 App Router** for pages and API routes
- **NextAuth.js (Auth.js)** with Discord provider for authentication (JWT sessions)
- **Sequelize** (shared instance from `src/shared/`) for database access
- **SmartAdmin** layout system: topbar, sidenav, footer, settings drawer
- **Bootstrap 5.3.7** via SmartAdmin's pre-built theme CSS (Lunar default)

```
Browser --> Next.js (src/dashboard/)
              |-- App Router (pages)
              |-- API Routes (/api/v1/*, /api/auth/*)
              |-- Sequelize --> PostgreSQL

Bot Process (src/bot/) --> Sequelize --> PostgreSQL (same DB)
```

The bot and dashboard share the same PostgreSQL database and Sequelize models (`src/shared/`), but run as separate processes. The dashboard no longer uses Express -- Next.js handles HTTP, routing, and API endpoints natively.

## Data Model

No schema changes. Existing models are reused:

- **Guild**: `id` (PK), `name`, `prefix`, `logsChannelId`, `language`, `levelUpMessage`
- **CommandLog**: `id` (PK auto), `guildId`, `userId`, `username`, `command`, `successful`, `createdAt`

## API Endpoints

### NextAuth (handled by Auth.js)
- `GET/POST /api/auth/[...nextauth]` -- Discord OAuth2 flow, session management, CSRF

### REST API (v1)
- `GET /api/v1/stats` -- Returns `{ guildCount, totalCommands }`. Requires owner auth.
- `GET /api/v1/guilds` -- Returns guild list ordered by name. Requires owner auth.
- `GET /api/v1/commands` -- Returns command usage stats grouped by command. Requires owner auth.
- `GET /api/v1/logs` -- Returns recent logs. Supports `?page=N&limit=N` for pagination. Requires owner auth.

## Business Rules

1. **Authentication**: All `/dashboard/*` pages require a valid NextAuth session. Unauthenticated users redirect to `/auth/login`.
2. **Authorization**: Only the bot owner (matching `BOT_OWNER_ID` env var) can sign in. The `signIn` callback rejects non-owner Discord accounts. API routes use `requireOwner()` from `lib/auth.ts` to verify both session and owner identity.
3. **Theme persistence**: Layout settings (theme, nav state) stored in localStorage via LayoutContext.
4. **Pagination**: Logs page shows 20 entries per page with URL query param `?page=N`.
5. **Data access**: All DB queries use the shared Sequelize instance from `src/shared/database.ts`.

## Dependencies

- No feature dependencies (this is the base dashboard)
- Shares Sequelize models with the bot process

## Known Issues

(none)
