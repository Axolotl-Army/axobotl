---
id: 02-smartadmin-dashboard
title: SmartAdmin Dashboard Integration
edition: Dashboard
depends_on: []
source_files:
  - public/css/smartapp.min.css
  - public/css/smartapp-rtl.min.css
  - public/css/themes/lunar.css
  - public/css/custom.css
  - public/plugins/**
  - public/scripts/**
  - public/icons/**
  - public/webfonts/**
  - public/img/**
  - views/partials/app-html.ejs
  - views/partials/app-head-css.ejs
  - views/partials/app-meta-title.ejs
  - views/partials/app-header.ejs
  - views/partials/app-sidebar.ejs
  - views/partials/app-footer.ejs
  - views/partials/app-drawer.ejs
  - views/partials/app-settings.ejs
  - views/partials/app-scripts.ejs
  - views/partials/app-pagetitle.ejs
  - views/login.ejs
  - views/error.ejs
  - views/dashboard/index.ejs
  - views/dashboard/commands.ejs
  - views/dashboard/logs.ejs
  - public/js/dashboard.js
routes: []
models: []
test_files: []
known_issues: []
---

# 02 -- SmartAdmin Dashboard Integration

## Purpose

Replace the current Bootstrap CDN-based dashboard UI with SmartAdmin's enterprise
admin framework. This gives the dashboard a professional look with the Lunar theme,
rich navigation, settings panel, and a full plugin ecosystem for future features.

## Architecture

The integration is a **UI-only migration**. No routes, middleware, models, or
business logic change. The Express server continues to serve EJS views and static
assets from `public/`. The only backend change is removing unused template variables
that SmartAdmin replaces with its own partial conventions.

### What changes

| Layer       | Before                       | After                                    |
|-------------|------------------------------|------------------------------------------|
| CSS         | Bootstrap 5.3.3 CDN          | SmartAdmin smartapp.min.css (local, includes Bootstrap 5.3.7) |
| Theme       | Manual dark theme CSS         | SmartAdmin Lunar theme                   |
| Icons       | Bootstrap Icons CDN           | SmartAdmin icons + FontAwesome (local)   |
| JS          | Bootstrap CDN bundle          | SmartAdmin plugins bundle (local)        |
| Layout      | navbar + sidebar + main       | app-header + app-sidebar + app-body + app-footer + app-drawer + app-settings |
| Partials    | head, navbar, sidebar, scripts | app-html, app-head-css, app-meta-title, app-header, app-sidebar, app-footer, app-drawer, app-settings, app-scripts, app-pagetitle |

### What stays the same

- Express routes and middleware
- Authentication flow (Passport + Discord OAuth2)
- Sequelize models and database queries
- API endpoints
- Rate limiting
- Session management

## Asset Mapping

Copy from `SmartAdmin/SmartAdmin-Seed/public/` to `public/`:

| Source directory | Target directory | Contents |
|-----------------|-----------------|----------|
| css/            | css/            | smartapp.min.css, smartapp-rtl.min.css, themes/ |
| plugins/        | plugins/        | All 13 plugin directories |
| scripts/        | scripts/        | Core JS (smartApp, smartNavigation, smartFilter, smartSlimscroll, saveloadscript) + page scripts |
| icons/          | icons/          | SVG sprite and individual icons |
| webfonts/       | webfonts/       | SmartAdmin + FontAwesome icon fonts |
| img/            | img/            | Favicons, avatars, demo images |

Existing `public/css/custom.css` is kept and updated for SmartAdmin overrides.
Existing `public/js/dashboard.js` is kept and updated.

## Partial Mapping

| Old partial        | New partial          | Notes |
|-------------------|---------------------|-------|
| partials/head.ejs  | partials/app-html.ejs + partials/app-meta-title.ejs + partials/app-head-css.ejs | Split into 3 SmartAdmin partials |
| partials/navbar.ejs | partials/app-header.ejs | Customized with Axobotl branding, Discord user avatar, logout |
| partials/sidebar.ejs | partials/app-sidebar.ejs | Customized with Axobotl nav items (Overview, Commands, Logs) |
| partials/scripts.ejs | partials/app-scripts.ejs | SmartAdmin core scripts + dashboard.js |
| (none)             | partials/app-footer.ejs | New: Axobotl footer |
| (none)             | partials/app-drawer.ejs | New: SmartAdmin drawer panel |
| (none)             | partials/app-settings.ejs | New: SmartAdmin settings/theme panel |
| (none)             | partials/app-pagetitle.ejs | New: breadcrumb + page title |

## Theme Configuration

- Default theme: **Lunar**
- Applied via CSS link: `/css/themes/lunar.css`
- HTML attribute: `data-bs-theme="dark"` (Lunar is a dark theme)

## Login Page

Based on SmartAdmin's `auth-login.ejs`, adapted for Discord OAuth:
- Remove email/password form
- Remove token login / OAuth buttons (Google, Microsoft, Apple)
- Keep the visual layout and animation (Vanta.js background)
- Single "Sign in with Discord" button
- Keep the existing error display for `auth_failed`

## Error Page

Restyled with SmartAdmin card layout, keeping existing error data
(`title`, `message`) and "Back to Dashboard" link.

## Dashboard Pages

All three pages (overview, commands, logs) use the SmartAdmin layout:
- app-html wrapper with Lunar theme
- app-header with Axobotl branding and user profile
- app-sidebar with Overview/Commands/Logs navigation
- app-body containing the page content
- app-footer
- app-settings panel

Content inside the pages stays functionally identical -- same data,
same tables, same pagination. Only the markup wrapping changes to
use SmartAdmin's card and layout classes.

## Business Rules

- All SmartAdmin assets must be copied to `public/`, never referenced from `SmartAdmin/`
- The Lunar theme CSS file must be loaded after `smartapp.min.css`
- Old partials (head.ejs, navbar.ejs, sidebar.ejs, scripts.ejs) are replaced, not kept alongside
- Sidebar active state is detected via JavaScript URL matching (no template variable needed)
- Route handlers must pass `pageTitle`, `pageSubTitle1` for SmartAdmin breadcrumbs
- Login and error pages are standalone (no sidebar/header layout)

## Dependencies

None -- this is a UI-only migration with no new npm packages.

## Known Issues

(none)
