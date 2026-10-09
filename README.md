# Assay

Open-source SQL data checks for PostgreSQL: write read-only checks, run them on a schedule, and hear about it where your team works when something changes.

**Live demo:** https://assay.majincheng.com (try it as a guest, or sign in with Google or GitHub; new accounts are viewers)

[![CI](https://github.com/jma49/Assay/actions/workflows/ci.yml/badge.svg)](https://github.com/jma49/Assay/actions/workflows/ci.yml)
[![Visual](https://github.com/jma49/Assay/actions/workflows/visual.yml/badge.svg)](https://github.com/jma49/Assay/actions/workflows/visual.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

[![The Checks page of the Assay demo](docs/images/checks.png)](https://assay.majincheng.com)

## What it does

A **check** is a read-only SQL query whose returned rows are problems: duplicate orders, payments that do not match, stock below zero. Assay runs checks on a schedule and keeps each one's state:

- **Clean** — no rows. **Issues** — rows that need attention, each marked new, still open or fixed since the last run. **Broken** — the query itself fails.
- **Alerts** go to Slack, Discord, Telegram, Feishu, WeCom or a signed webhook when a check breaks, finds rows, gets new rows or recovers; with acknowledge, mute, owners, a daily summary and reminders.
- **Agents** (Claude Code, Cursor, …) can list, read and run checks through the MCP server, signing in with OAuth (the client opens a browser to sign in and consent) or with a personal API key.
- **Data sources**: `DATABASE_URL` is the built-in database; admins can add more PostgreSQL databases (connection strings encrypted, private hosts refused unless allowed) and each check picks the one it runs against.
- **Review**: changes by non-admins go through approval; every edit is recorded in the edit history.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · MongoDB (checks, runs, users) · PostgreSQL (the databases being checked) · Upstash Redis (cache, rate limits) · Better Auth (Google, GitHub) · Vitest and Playwright. Exact versions are in `package.json`.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in MongoDB, PostgreSQL, Redis, Better Auth and one OAuth provider
npm run seed:demo            # optional: a demo schema and sample checks
npm run dev
```

Sign in once, then make yourself admin: `npm run user:set-role -- you@example.com admin`.

### Local services

`npm run dev:services` starts MongoDB, PostgreSQL and Redis (with Upstash's
REST protocol) from `compose.yaml`, so development needs no cloud accounts.
Point `.env.local` at them:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/assay_dev
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/assay_demo
UPSTASH_REDIS_REST_URL=http://127.0.0.1:8079
UPSTASH_REDIS_REST_TOKEN=local
BETTER_AUTH_SECRET=local-development-only-not-a-secret
APP_URL=http://localhost:3000
AUTH_DEV_PASSWORD_LOGIN=true   # email and password sign-in, next dev only
```

`AUTH_DEV_PASSWORD_LOGIN` removes the need for a Google or GitHub app
locally; production refuses it.

### Scheduled runs

Scheduled runs need something to call `POST /api/cron/run-scheduled` every
30 minutes (QStash, any cron, or `npm run sql:run-scheduled`); see
[docs/deployment.md](docs/deployment.md#scheduled-runs).

## Documentation

| | |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Layers, how a check runs, data sources, API conventions |
| [docs/engineering.md](docs/engineering.md) | Invariants, public contracts, hotspots, verification |
| [docs/database.md](docs/database.md) | Collections, fields, indexes, retention, concurrency |
| [docs/authentication.md](docs/authentication.md) | Sign-in and roles |
| [docs/notifications.md](docs/notifications.md) | Alert channels, delivery, setup |
| [docs/mcp.md](docs/mcp.md) | Connecting agents (OAuth or API key), tools, security |
| [docs/deployment.md](docs/deployment.md) | Configuration, scheduled runs, first deploy, smoke test, rollback |
| [docs/backup-restore.md](docs/backup-restore.md) | MongoDB backups and restore |
| [docs/secret-rotation.md](docs/secret-rotation.md) | Rotating or recovering `ASSAY_SECRET_KEY` |
| [docs/roadmap.md](docs/roadmap.md) | Open reliability goals |
| [DESIGN.md](DESIGN.md) | Design tokens, components, the brand mark |
| [scripts/README.md](scripts/README.md) | Command-line tools and migrations |
| `/docs` in the app | User guide (English and Chinese) |

## Development

```bash
npm run typecheck && npm run lint && npm test   # before every commit (see AGENTS.md)
npx knip && npm run build                         # before a pull request (CI runs both)
```

```
src/
├── app/            # routes: pages and API
├── components/     # UI
├── contracts/      # request and response types shared by server and client
├── domain/         # pure rules: runs, alerts, digests, reminders
├── lib/            # infrastructure: config, logging, auth, database clients, SQL validation
└── server/         # services, repositories, notifications, MCP
scripts/            # CLI entry points and migrations
docs/               # engineering docs
```

## Contributing

Issues and pull requests are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md).
Report security problems privately, as [SECURITY.md](SECURITY.md) describes.

## License

[Apache License 2.0](LICENSE). Copyright 2025-2026 Jincheng Ma; see [NOTICE](NOTICE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
