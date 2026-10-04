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

No cloud accounts needed for development: `npm run dev:services` starts
MongoDB, PostgreSQL and Redis (with Upstash's REST protocol) from
`compose.yaml`. Point `.env.local` at them:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/assay_dev
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/assay_demo
UPSTASH_REDIS_REST_URL=http://127.0.0.1:8079
UPSTASH_REDIS_REST_TOKEN=local
BETTER_AUTH_SECRET=local-development-only-not-a-secret
APP_URL=http://localhost:3000
AUTH_DEV_PASSWORD_LOGIN=true   # email and password sign-in, next dev only
```

With `AUTH_DEV_PASSWORD_LOGIN=true` the sign-in page also offers email and
password, so you need no Google or GitHub app locally; it is refused in
production.

### Scheduled runs

A schedule calls `POST /api/cron/run-scheduled` every 30 minutes: an Upstash
QStash schedule (signed) or any cron with the `CRON_SECRET` bearer token. The
GitHub Actions workflow `.github/workflows/sql-check-cron.yml` is the
fallback, and a server of your own can run `npm run sql:run-scheduled` from
cron. See [docs/deployment.md](docs/deployment.md).

## Documentation

| | |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Layers, run pipeline, concurrency rules, phases |
| [docs/database.md](docs/database.md) | Collections, fields, indexes, retention, concurrency |
| [docs/authentication.md](docs/authentication.md) | Sign-in, roles, moving from Clerk |
| [docs/engineering.md](docs/engineering.md) | Invariants, public contracts, hotspots, verification |
| [docs/roadmap.md](docs/roadmap.md) | Reliability and infrastructure goals |
| [docs/notifications.md](docs/notifications.md) | Alert channels, delivery model, setup |
| [docs/mcp.md](docs/mcp.md) | Connecting agents (OAuth or API key), tools, security |
| [docs/brand.md](docs/brand.md) | The Row A mark, colours, type |
| [docs/deployment.md](docs/deployment.md) | Configuration, scheduled runs, first deploy and a smoke test after each one |
| [scripts/README.md](scripts/README.md) | Command-line tools and migrations |
| `/docs` in the app | User guide (English and Chinese) |

## Development

```bash
npm run typecheck && npm run lint && npm test   # before every commit (see AGENTS.md)
npx knip                                          # unused files, exports and dependencies (CI runs it)
npm run build
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
