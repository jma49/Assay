# Assay

Open-source SQL data checks for PostgreSQL: write read-only checks, run them on a schedule, and hear about it where your team works when something changes.

**Live demo:** https://assay.majincheng.com (try it as a guest, or sign in with Google or GitHub; new accounts are viewers)

[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6-green.svg)](https://www.mongodb.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-checked-336791.svg)](https://www.postgresql.org/)
[![Better Auth](https://img.shields.io/badge/Better%20Auth-Google%20%7C%20GitHub-purple.svg)](https://www.better-auth.com/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

## What it does

A **check** is a read-only SQL query whose returned rows are problems: duplicate orders, payments that do not match, stock below zero. Assay runs checks on a schedule and keeps each one's state:

- **Clean** — no rows. **Issues** — rows that need attention, each marked new, still open or fixed since the last run. **Broken** — the query itself fails.
- **Alerts** go to Slack, Discord, Telegram, Feishu, WeCom or a signed webhook when a check breaks, finds rows, gets new rows or recovers; with acknowledge, mute, owners, a daily summary and reminders.
- **Agents** (Claude Code, Cursor, …) can list, read and run checks through the MCP server, signing in with OAuth (the client opens a browser to sign in and consent) or with a personal API key.
- **Data sources**: `DATABASE_URL` is the built-in database; admins can add more PostgreSQL databases (connection strings encrypted, private hosts refused unless allowed) and each check picks the one it runs against.
- **Review**: changes by non-admins go through approval; every edit is recorded in the edit history.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · MongoDB (checks, runs, users) · PostgreSQL (the databases being checked) · Upstash Redis (cache, rate limits) · Better Auth (Google, GitHub) · Vitest.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in MongoDB, PostgreSQL, Redis, Better Auth and one OAuth provider
npm run seed:demo            # optional: a demo schema and sample checks
npm run dev
```

Sign in once, then make yourself admin: `npm run user:set-role -- you@example.com admin`.

Scheduled checks run from GitHub Actions (`.github/workflows/sql-check-cron.yml`) or from cron on your own server (`npm run sql:run-scheduled`).

## Documentation

| | |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Layers, run pipeline, concurrency rules, phases |
| [docs/database.md](docs/database.md) | Collections, fields, indexes, retention, concurrency |
| [docs/authentication.md](docs/authentication.md) | Sign-in, roles, moving from Clerk |
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
├── lib/            # auth, database clients, SQL validation, utilities
└── server/         # services, repositories, notifications, MCP
scripts/            # CLI entry points and migrations
docs/               # engineering docs
```

## License

[Apache License 2.0](LICENSE). Copyright 2025-2026 Jincheng Ma; see [NOTICE](NOTICE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
