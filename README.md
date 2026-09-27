# Assay

Open-source SQL data checks for PostgreSQL: write read-only checks, run them on a schedule, and hear about it where your team works when something changes.

**Live demo:** https://assay.majincheng.com (try it as a guest, or sign in with Google or GitHub; new accounts are viewers)

[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6-green.svg)](https://www.mongodb.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-checked-336791.svg)](https://www.postgresql.org/)
[![Better Auth](https://img.shields.io/badge/Better%20Auth-Google%20%7C%20GitHub-purple.svg)](https://www.better-auth.com/)

## What it does

A **check** is a read-only SQL query whose returned rows are problems: duplicate orders, payments that do not match, stock below zero. Assay runs checks on a schedule and keeps each one's state:

- **Clean** — no rows. **Issues** — rows that need attention, each marked new, still open or fixed since the last run. **Broken** — the query itself fails.
- **Alerts** go to Slack, Discord, Telegram, Feishu, WeCom or a signed webhook when a check breaks, finds rows, gets new rows or recovers; with acknowledge, mute, owners, a daily summary and reminders.
- **Agents** (Claude Code, Cursor, …) can list, read and run checks through the MCP server with personal API keys.
- **Review**: changes by non-admins go through approval; every edit is versioned and audited.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · MongoDB (checks, runs, users) · PostgreSQL (the database being checked) · Upstash Redis (cache, rate limits) · Better Auth (Google, GitHub) · Vitest.

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
| [docs/mcp.md](docs/mcp.md) | Connecting agents, tools, security |
| [docs/brand.md](docs/brand.md) | The beetle, colours, type |
| [docs/post-deploy-checklist.md](docs/post-deploy-checklist.md) | What to verify after each production deploy |
| [scripts/README.md](scripts/README.md) | Command-line tools and migrations |
| `/docs` in the app | User guide (English and Chinese) |

## Development

```bash
npm run typecheck && npm run lint && npm test   # before every commit (see AGENTS.md)
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

## 📄 License

This project is proprietary software. All rights reserved.
