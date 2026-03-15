# Dashboard Configuration Test Plan

**Created:** 2026-03-15
**Feature:** dashboard-configuration
**Status:** Not Started

---

## Quick Status

Layout Settings:        NOT TESTED
Theme Persistence:      NOT TESTED
Settings Drawer UI:     NOT TESTED
Factory Reset:          NOT TESTED
Authentication:         NOT TESTED
Rate Limiting:          NOT TESTED
Security Headers:       NOT TESTED
Guild Data API:         NOT TESTED
Navigation Filtering:   NOT TESTED

---

## Prerequisites

- [ ] PostgreSQL running (`docker compose up postgres -d`)
- [ ] Dashboard running (`pnpm dev:dashboard`)
- [ ] `.env` configured with valid `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`, `BOT_OWNER_ID`
- [ ] At least one guild in the database (run bot briefly or seed data)
- [ ] Authenticated as the bot owner (Discord OAuth)

---

## Test 1: Layout Settings (SettingsDrawer)

**Component:** `src/dashboard/layouts/components/SettingsDrawer.tsx`
**Context:** `src/dashboard/context/useLayoutContext.tsx`

### 1.1 Open and close Settings Drawer

**Action:** Click the gear/cog icon to open the Settings Drawer
**Expected:** Offcanvas drawer slides in from the right with title "App Builder"

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Drawer opens | Offcanvas visible | | |
| Title shown | "App Builder" | | |
| Close button works | Drawer slides out | | |

### 1.2 Toggle each layout setting

**Action:** Toggle each setting one at a time, observe the layout change

| Setting | Toggle | Expected Effect | Actual | Status |
|---------|--------|----------------|--------|--------|
| Header Fixed | ON | Header stays fixed on scroll | | |
| Nav Full Height | ON | Sidebar extends full viewport height | | |
| Nav Fixed | ON | Sidebar stays fixed on scroll | | |
| Nav Collapsed | ON | Sidebar collapses to icons only | | |
| Nav Minified | ON | Sidebar becomes a thin strip | | |
| Dark Navigation | ON | Sidebar switches to dark color scheme | | |
| Colorblind Mode | ON | Color palette adjusts for colorblindness | | |
| High Contrast Mode | ON | Contrast increases across the UI | | |

### 1.3 Multiple settings combined

**Action:** Enable Header Fixed + Nav Fixed + Dark Navigation simultaneously
**Expected:** All three effects apply without conflict

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Header fixed | Stays on scroll | | |
| Nav fixed | Stays on scroll | | |
| Dark nav | Dark sidebar | | |
| No visual glitches | Clean rendering | | |

---

## Test 2: Theme Toggle

**Component:** `src/dashboard/layouts/components/topbar/components/ThemeToggler.tsx`

### 2.1 Toggle light/dark theme

**Action:** Click the theme toggle button in the top navigation bar
**Expected:** Theme switches between light and dark mode

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Dark to light | All backgrounds, text, cards switch to light palette | | |
| Light to dark | All backgrounds, text, cards switch to dark palette | | |
| Toggle icon | Icon reflects current theme state | | |

### 2.2 Theme persists across page navigation

**Action:** Set dark theme, navigate to another page (e.g., Commands), then back
**Expected:** Dark theme remains active on all pages

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Theme after nav | Same theme as set | | |
| No flash of wrong theme | Smooth transition | | |

---

## Test 3: Settings Persistence (localStorage)

**Key:** `__AXOBOTL_DASHBOARD_CONFIG__`

### 3.1 Settings survive page reload

**Action:** Enable Nav Collapsed + Dark Navigation, hard refresh the page (Ctrl+Shift+R)
**Expected:** Both settings still active after reload

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Nav Collapsed | Still collapsed | | |
| Dark Navigation | Still dark | | |
| localStorage key | Contains both settings as `true` | | |

### 3.2 Settings survive browser close/reopen

**Action:** Enable several settings, close the browser tab, reopen the dashboard URL
**Expected:** All settings restored from localStorage

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| All toggles | Match previously set values | | |
| Visual state | Matches toggle states | | |

### 3.3 localStorage data structure

**Action:** Open DevTools > Application > Local Storage, inspect `__AXOBOTL_DASHBOARD_CONFIG__`
**Expected:** Valid JSON with all setting keys

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| JSON valid | Parses without error | | |
| Keys present | theme, headerFixed, navFull, navFixed, navCollapsed, navMinified, darkNavigation, colorblindMode, highContrastMode | | |
| Values type | All booleans except `theme` (string) | | |

---

## Test 4: Factory Reset

### 4.1 Reset clears all settings

**Action:** Enable multiple settings, then click "Factory Reset" in the Settings Drawer
**Expected:** All settings revert to defaults, localStorage key cleared

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| All toggles | Reset to OFF/defaults | | |
| Theme | Reverts to dark (default) | | |
| localStorage | Key removed or reset to defaults | | |
| CSS classes | Removed from DOM elements | | |
| Visual state | Default layout rendered | | |

### 4.2 Reset followed by reload

**Action:** Factory reset, then hard refresh
**Expected:** Default settings persist (no stale data)

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Post-reload state | Default layout | | |
| No errors in console | Clean load | | |

---

## Test 5: Authentication & Authorization

**Config:** `src/dashboard/lib/auth.ts`

### 5.1 Unauthenticated access redirects to login

**Action:** Open dashboard URL in incognito/private window (no session)
**Expected:** Redirected to `/auth/login`

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Redirect | `/auth/login` page shown | | |
| No dashboard content | Admin pages not visible | | |
| Response code | 302 redirect or client-side redirect | | |

### 5.2 Non-owner user denied access

**Action:** Log in with a Discord account whose ID does NOT match `BOT_OWNER_ID`
**Expected:** Access denied (not authorized)

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Error shown | "Not authorized" or equivalent | | |
| No admin pages | Dashboard content not rendered | | |

### 5.3 Owner user granted access

**Action:** Log in with the Discord account matching `BOT_OWNER_ID`
**Expected:** Full access to dashboard

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Redirect | `/dashboard` overview page | | |
| User info | Avatar and name shown in topbar | | |
| All pages accessible | Commands, Logs pages load | | |

### 5.4 Session expiry

**Action:** Log in, wait for session to expire (or manually delete the session cookie), refresh
**Expected:** Redirected back to login

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Redirect | `/auth/login` | | |
| Session max age | 7 days (JWT) | | |

### 5.5 Logout flow

**Action:** Click logout in the profile dropdown
**Expected:** Session destroyed, redirected to login

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Redirect | `/auth/login` | | |
| Session cookie | Cleared | | |
| Back button | Does NOT re-enter dashboard | | |

---

## Test 6: Rate Limiting

**Config:** `src/dashboard/middleware.ts`

### 6.1 API rate limit enforcement

**Action:** Send 61+ requests to `/api/v1/stats` within 60 seconds
**Expected:** 61st request returns 429 Too Many Requests

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Requests 1-60 | 200 OK | | |
| Request 61 | 429 Too Many Requests | | |
| Response body | Rate limit error message | | |

### 6.2 Auth rate limit enforcement

**Action:** Send 11+ requests to auth endpoints within 60 seconds
**Expected:** 11th request returns 429

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Requests 1-10 | Normal response | | |
| Request 11 | 429 Too Many Requests | | |

### 6.3 Rate limit window reset

**Action:** Hit the rate limit, wait 60 seconds, retry
**Expected:** Requests succeed again after the window resets

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| After window reset | 200 OK | | |

---

## Test 7: Security Headers

**Config:** `src/dashboard/next.config.ts`

### 7.1 Verify security headers present

**Action:** Use DevTools Network tab or `curl -I` to inspect response headers on any dashboard page
**Expected:** All security headers present

| Header | Expected Value | Actual | Status |
|--------|---------------|--------|--------|
| X-Frame-Options | DENY | | |
| X-Content-Type-Options | nosniff | | |
| Referrer-Policy | strict-origin-when-cross-origin | | |
| X-DNS-Prefetch-Control | off | | |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | | |

### 7.2 CSRF protection

**Action:** Send a POST request to an API endpoint with an `Origin` header that does NOT match the dashboard URL
**Expected:** Request rejected (CSRF check fails)

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Mismatched origin | 403 or equivalent error | | |
| Matching origin | Request proceeds normally | | |

---

## Test 8: Guild Data API

**Endpoint:** `GET /api/v1/guilds`

### 8.1 Authenticated request returns guilds

**Action:** Make authenticated GET request to `/api/v1/guilds`
**Expected:** JSON array of guild objects sorted by name

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Response code | 200 | | |
| Content-Type | application/json | | |
| Data shape | Array of objects with `id`, `name`, `prefix`, `language` | | |
| Sort order | Alphabetical by name | | |

### 8.2 Unauthenticated request denied

**Action:** Make GET request to `/api/v1/guilds` without session cookie
**Expected:** 401 Unauthorized or redirect to login

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Response code | 401 or 302 | | |
| No data leaked | Guild data not returned | | |

### 8.3 Guild data fields

**Action:** Inspect a guild object from the API response
**Expected:** All configuration fields present

| Field | Expected Type | Actual | Status |
|-------|--------------|--------|--------|
| id | string (snowflake) | | |
| name | string | | |
| prefix | string (default "!") | | |
| logsChannelId | string or null | | |
| language | string (default "en") | | |
| levelUpMessage | string or null | | |

---

## Test 9: Navigation & Menu Filtering

### 9.1 All menu items render

**Action:** Load the dashboard, inspect the sidebar
**Expected:** All menu items visible

| Menu Item | Route | Visible | Status |
|-----------|-------|---------|--------|
| Overview | /dashboard | | |
| Commands | /dashboard/commands | | |
| Command Logs | /dashboard/logs | | |

### 9.2 Menu filter/search

**Action:** Type "comm" into the sidebar search/filter input
**Expected:** Only "Commands" and "Command Logs" visible, "Overview" hidden

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Filtered items | Commands, Command Logs | | |
| Hidden items | Overview | | |
| Clear filter | All items return | | |

### 9.3 Active page highlighting

**Action:** Navigate to Commands page
**Expected:** "Commands" menu item is highlighted/active

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Active indicator | Commands highlighted | | |
| Other items | Not highlighted | | |

---

## Test 10: Edge Cases

### 10.1 Empty localStorage

**Action:** Clear all localStorage, reload the dashboard
**Expected:** Default settings applied, no errors

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| No JS errors | Console clean | | |
| Default theme | Dark mode | | |
| Default layout | All toggles off/default | | |

### 10.2 Corrupted localStorage

**Action:** Set `__AXOBOTL_DASHBOARD_CONFIG__` to invalid JSON (e.g., `"{broken"`), reload
**Expected:** Graceful fallback to defaults, no crash

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| No crash | Page loads | | |
| Defaults applied | Default layout | | |
| Error handling | Silent recovery or console warning | | |

### 10.3 API endpoint with no data

**Action:** Query `/api/v1/stats` with an empty database (no guilds, no logs)
**Expected:** Returns zero counts, no errors

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Response code | 200 | | |
| Guild count | 0 | | |
| Command count | 0 | | |

### 10.4 Concurrent settings changes (multiple tabs)

**Action:** Open dashboard in two tabs, change theme in Tab A, check Tab B
**Expected:** Tab B reflects the change on next interaction or reload (localStorage is shared)

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Tab B after reload | Matches Tab A settings | | |

---

## Pass/Fail Criteria

| Criteria | Pass | Fail |
|----------|------|------|
| All layout toggles work | Each toggle produces visible change | Any toggle has no effect |
| Settings persist | Survive reload and browser restart | Lost on refresh |
| Factory reset works | All settings return to defaults | Any setting stuck |
| Auth blocks unauthorized users | Non-owner and unauthenticated denied | Any unauthorized access |
| Rate limiting enforced | Requests blocked after threshold | Unlimited requests allowed |
| Security headers present | All 5 headers correct | Any header missing |
| API returns correct data | Shape matches model, sorted | Wrong shape or unsorted |
| Edge cases handled | Graceful fallback, no crashes | JS errors or blank page |

---

## Sign-Off

| Test | Tester | Date | Status |
|------|--------|------|--------|
| Test 1: Layout Settings | | | |
| Test 2: Theme Toggle | | | |
| Test 3: Settings Persistence | | | |
| Test 4: Factory Reset | | | |
| Test 5: Authentication | | | |
| Test 6: Rate Limiting | | | |
| Test 7: Security Headers | | | |
| Test 8: Guild Data API | | | |
| Test 9: Navigation | | | |
| Test 10: Edge Cases | | | |
