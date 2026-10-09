# Engineering contract

The invariants a change to Assay must keep. `AGENTS.md` holds the day-to-day
rules; read this before changing server code, the run pipeline, alerts, data
sources or MCP.

## Red lines

A change that breaks one is incomplete.

### Safety

- **Checks are read-only.** SQL passes the static read-only validator and
  runs inside a read-only transaction with a statement timeout. Never weaken
  the validator to make a check work.
- **No write path to monitored databases** from code that executes checks,
  MCP tools included.
- **Secrets stay sealed.** Data-source connection strings and channel
  secrets are encrypted with `ASSAY_SECRET_KEY`, never returned by an API,
  never logged in full.
- **SSRF guards stay on.** Private, loopback and link-local addresses are
  refused unless `ALLOW_PRIVATE_DATA_SOURCES=true` is set for a self-hosted
  private network.
- **TLS verification** is required for public PostgreSQL hosts.
- **Fail closed on missing configuration.** A production server exits on
  start without `BETTER_AUTH_SECRET`, `MONGODB_URI`, `DATABASE_URL` and
  `APP_URL` (`src/lib/config/required-env.ts`). Never add a silent default
  for a required variable; a new one goes on that list. Optional features
  stay off with one warning each.

### Concurrency and state

- **All check execution goes through `runCheck`.** Manual, scheduled,
  batch, API and MCP triggers never open a second path.
- **Respect the per-check lease and fencing token.** A run whose lease
  expired must not overwrite newer state.
- **Check state lives on the check document**, not rebuilt from history on
  each request.

### Results storage

- Store the exact **row count**, a **capped sample** (≤500 rows, ≤1 MB) and
  capped **row fingerprints**. Never store unbounded results on a run
  (MongoDB's 16 MB document limit).

### Auth and roles

- New accounts are **viewers**; privilege escalation is an explicit admin
  action.
- Non-admin check create/edit/delete goes through **approval** when review
  is on. No "convenience" API bypasses it.

### Agents and MCP

- MCP tools act with the caller's permissions only.
- Privileged actions (approving as admin, managing data sources, changing
  roles) are never exposed as unconstrained tools.

## Public contracts

| Contract | Stability rule |
|----------|----------------|
| Check outcome enum | `clean` \| `issues` \| `error` in storage and in `GET /api/checks` (never rename). The UI, MCP tools and alerts show `error` as **broken**; the one mapping is `CHECK_STATUS` in `src/domain/run.ts` |
| Check id field | `scriptId` in MongoDB (`checks`, `script_versions`, `approval_requests`, `edit_history`) and API bodies: a legacy name kept on purpose, since renaming needs a data migration for no user benefit. Code, routes and permissions say "check" (`/api/checks`, `check:*`); `/api/scripts` is a deprecated alias |
| Run document shape | count + sample + fingerprints + outcome + timing |
| Alert event types | outcome changes, new rows, recovery, broken query |
| `GET /api/health` | Public, no auth. `200` ok, `503` degraded. Reports component name, status and latency only, never internals or error details |
| Scheduler heartbeat | Written only by a scheduled `scripts/run-all-scripts.ts` run; health reports `stale` when none started in 12 hours (`HEARTBEAT_STALE_MS`) |
| Scheduled trigger | `POST /api/cron/run-scheduled`: QStash signature (`QSTASH_*_SIGNING_KEY`, `devMode: false`) or `CRON_SECRET` bearer; answers counts only; a 500 makes QStash retry. Fallback: `.github/workflows/sql-check-cron.yml` runs `npx tsx scripts/run-all-scripts.ts "$EXECUTION_MODE"` (`npm run sql:run-scheduled` locally) |
| Dispatch | `POST /api/notifications/dispatch`, `CRON_SECRET` bearer |
| Dead-letter API | `GET /api/notifications/deliveries/failed` and `POST .../requeue`, guarded by `NOTIFICATION_MANAGE` |
| Sentry | `@sentry/nextjs` v11, `withSentryConfig` from `@sentry/nextjs/config`. No DSN = disabled. Errors only: no tracing, no replay, `sendDefaultPii` off. Never send raw pg error fields (`detail`, `hint`, `internalQuery`) |
| Structured logs | One JSON object per line, request id via `runWithRequestId`. Never log secrets or PII in full |
| MCP tool names and args | Additive changes preferred; breaking changes need migration notes |
| `.env.example` variable names | Every new variable is declared in `src/lib/config/env.ts` and listed in `.env.example` (a test enforces both) |

In any machine/JSON mode, **stdout carries one result object** (or a
documented stream); status noise goes to logs or stderr.

## Architecture rules

1. **Routes are thin:** parse input, call a service, map errors.
2. **Services own use cases** (`runCheck`, approvals, notification dispatch,
   batches) under `server/services/`.
3. **Repos own persistence.** No ad-hoc Mongo access in routes.
4. **Domain is pure:** outcome transitions, diffs and schedule logic are
   testable without I/O.
5. **One pool registry for data sources,** keyed by id and version; editing
   a source invalidates its pools and schema cache.
6. **Alerts go through the outbox:** durable, idempotent sends, never
   fire-and-forget.

Details: [architecture.md](architecture.md).

## Verification expectations

| Change | Minimum proof |
|--------|---------------|
| Domain rule (outcome, diff, schedule) | Unit tests |
| `runCheck`, lease, fencing | Integration-style test or a scripted scenario against real Mongo and Postgres when feasible |
| SQL validator | Cases for blocked writes, allowed SELECT/WITH/EXPLAIN, quoted side-effect names |
| Data source save/test | SSRF rejections; secrets not echoed |
| Alert channel | Idempotency documented; test send still works |
| API contract or MCP tool | Type/schema test; an authz negative case |
| Observability (logs, health, Sentry) | Unit test where possible; no secret or PII in output |
| UI only | Existing visual/unit coverage; no server invariant weakened |

Never silence a failing check by raising timeouts, skipping tests or
broadening permissions without a written reason in the PR.

## Hotspots

Touching these needs extra care and matching tests.

| Hotspot | Paths | Regression risk |
|---------|-------|-----------------|
| Read-only enforcement | `lib/sql/*`, data-source execute path | Writes slip through; timeout bypass |
| Lease / fencing | `runCheck`, the check's `lease` | Double runs; stale run overwrites state |
| Result sampling | run persistence | 16 MB document failures; wrong counts |
| Data-source secrets | `server/crypto`, data_sources repo | Leaks in API or logs |
| SSRF / DNS rebinding | data-source connection guard, `lib/net` | Reaching metadata or internal hosts |
| Approval flow | check change and approval services | Privilege bypass; unreviewed SQL live |
| Alert dispatch | notify, outbox | Duplicate storms; silent drops |
| MCP authz | `server/mcp/*` | Agent performs admin actions |
| Cron entry | scheduled runner, `CRON_SECRET`, QStash keys | Unauthorized trigger; missed runs |
| Scheduler slot claims | `run-checks.ts` claim/release | Lost slot on a hard kill |

## Debugging

1. Confirm the root cause before fixing, especially for regressions.
2. If it is unknown, first make the failure observable (a log with
   `requestId`/`checkId`/`runId`, a metric or a failing test).
3. One failure mode per change; no drive-by refactors in a bugfix.
4. For production incidents check, in order: lease contention → Postgres
   timeout/connectivity → Mongo write → alert delivery → cron trigger auth.

## Documentation duties

Update docs in the same change:

| Change | Doc |
|--------|-----|
| Run pipeline, concurrency, layers, API conventions | `docs/architecture.md` |
| Collections, indexes, retention, migrations | `docs/database.md` |
| Auth providers, roles | `docs/authentication.md` |
| Channels, payload shape | `docs/notifications.md` |
| MCP tools, OAuth, API keys | `docs/mcp.md` |
| Env vars, deploy, smoke test | `docs/deployment.md` |
| CLI entry points | `scripts/README.md` |
| Invariants, contracts, hotspots | `docs/engineering.md` |
| Tokens, components, the brand mark | `DESIGN.md` |

The in-app user guide (`src/content/docs`, English and Chinese) follows any
behavior change operators see.

## Product north star

When choosing what to build next, prefer in order: **reliability**
(scheduling, leases, retries, no silent missed runs), **observability**,
**safety** (read-only, secrets, SSRF, authz), **operator UX** (clear
failures, approval, alert quality), then **new features**. Assay wins by
being a check system teams can leave on overnight, not by surface area.
