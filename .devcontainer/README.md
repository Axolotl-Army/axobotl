# Dev Container Guide

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose v2 on Linux)
- [VS Code](https://code.visualstudio.com/) with the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension

Or: a GitHub account for [Codespaces](https://github.com/features/codespaces) (no local install needed).

## First-Time Setup

### Local (VS Code)

1. Clone the repo and open it in VS Code.
2. Copy `.env.example` to `.env` and fill in your Discord secrets
   (`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
   `BOT_OWNER_ID`, `SESSION_SECRET`).
   Leave `DATABASE_URL` as-is -- the dev container overrides it automatically.
3. Press **Ctrl+Shift+P** (or **Cmd+Shift+P** on macOS) and run
   **Dev Containers: Reopen in Container**.
4. Wait for the build to finish. Dependencies install and the database
   schema syncs automatically.

### GitHub Codespaces

1. On the repository page, click **Code > Codespaces > New codespace**.
2. Add your secrets under **Settings > Codespaces > Secrets** first:
   `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
   `BOT_OWNER_ID`, `SESSION_SECRET`.
3. The codespace builds, installs dependencies, and syncs the database
   automatically.

## Daily Workflow

Open a terminal inside the container and run:

```bash
# Start both bot and dashboard (hot-reload)
pnpm dev

# Or start them individually
pnpm dev:bot
pnpm dev:dashboard
```

The dashboard is available at **http://localhost:3000** (the port is
forwarded automatically).

## Common Commands

| Command                | What it does                          |
|------------------------|---------------------------------------|
| `pnpm dev`             | Run bot + dashboard with hot-reload   |
| `pnpm dev:bot`         | Bot only                              |
| `pnpm dev:dashboard`   | Dashboard only (port 3000)            |
| `pnpm db:sync`         | Sync Sequelize models to database     |
| `pnpm deploy-commands` | Register slash commands with Discord  |
| `pnpm typecheck`       | Type-check the whole project          |
| `pnpm test:unit`       | Run unit tests                        |

## Connecting to PostgreSQL

From inside the dev container:

```bash
psql postgresql://postgres:postgres@db:5432/axobotl
```

Or use the SQLTools extension (pre-installed) with these settings:

| Setting  | Value      |
|----------|------------|
| Host     | `db`       |
| Port     | `5432`     |
| User     | `postgres` |
| Password | `postgres` |
| Database | `axobotl`  |

## Rebuilding the Container

If you change the Dockerfile or devcontainer.json, run
**Dev Containers: Rebuild Container** from the command palette.
Your database volume persists across rebuilds.

To start completely fresh (including the database), run
**Dev Containers: Rebuild Container Without Cache** and then delete
the `devcontainer-pgdata` Docker volume:

```bash
docker volume rm devcontainer-pgdata
```
