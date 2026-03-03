# Architectural Decisions — Axobotl

## ADR-001: Sequelize over StrictDB

**Decision:** Use Sequelize directly instead of the StrictDB wrapper used in other starter-kit projects.

**Reason:** Sequelize provides ORM-level features critical for Discord bots:
- Typed model associations (`Guild.hasMany(CommandLog)`)
- Proper migration support (future)
- `sync({ alter })` for fast local development
- Mature ecosystem in the discord.js community

StrictDB is optimized for MongoDB document access patterns; Sequelize is the standard choice for relational Discord bot data.

## ADR-002: Two processes, one repo (monorepo-lite)

**Decision:** Bot and dashboard run as separate Node.js processes but share source code in one repository.

**Reason:** Shared Sequelize models avoid duplication and ensure schema consistency. Running separately lets each service fail independently — a bot crash won't take down the dashboard.

## ADR-003: EJS over React/Vue for dashboard

**Decision:** EJS server-rendered templates instead of a SPA frontend.

**Reason:** A bot dashboard has modest UI needs. EJS eliminates a build step, reduces complexity, and allows Bootstrap 5 via CDN with no bundler. A SPA is unnecessary overhead for this use case.

## ADR-004: Bootstrap 5 via CDN

**Decision:** Load Bootstrap from jsDelivr CDN rather than bundling.

**Reason:** No build step for CSS/JS, always references a pinned version, simplifies Docker image (no `public/` build artifacts). Acceptable for internal-use dashboards.

## ADR-005: Passport.js for Discord OAuth2

**Decision:** Use `passport-discord` for authentication.

**Reason:** Discord OAuth2 is non-trivial to implement from scratch. Passport is the de-facto Node.js auth framework and the `passport-discord` strategy is actively maintained.
