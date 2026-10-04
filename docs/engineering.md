# Engineering contract

The invariants a change to Assay must keep. `AGENTS.md` holds the day-to-day
rules and points here; read this before changing server code, the run
pipeline, alerts, data sources or MCP.

## Hard red lines

Non-negotiable. A change violating them is incomplete.

### Safety

- **Checks are read-only.** SQL must pass the static read-only validator
  and run inside a read-only transaction with a statement timeout. Never
  weaken the validator to "make a check work."
- **No write path to monitored databases** from app code paths that execute
  checks (including MCP tools).
- **Secrets stay sealed.** Data-source connection strings and channel
  secrets are encrypted with `ASSAY_SECRET_KEY`, never returned by APIs,
  never logged in full.
- **SSRF guards stay on.** Host resolution must refuse private/loopback/
  link-local addresses unless `ALLOW_PRIVATE_DATA_SOURCES=true` is
  explicitly set for self-hosted private networks.
- **TLS verification** for public PostgreSQL hosts is required.
- **Fail closed on missing configuration.** A production server exits on
  start without `BETTER_AUTH_SECRET`, `MONGODB_URI`, `DATABASE_URL` and
  `APP_URL` (`src/lib/config/required-env.ts`), naming only the missing
  variables. Never add a silent default for a required variable; a new one
  goes on that list. Optional features stay off with one warning each.

### Concurrency and state

- **All check execution goes through `runCheck`.** Manual, scheduled,
  batch, API, and MCP triggers must not open a second execution path.
- **Per-check lease + fencing token** must be respected. A run whose lease
  expired must not overwrite newer state.
- **Check state is stored on the check document**, not rebuilt from full
  history on every request.

### Results storage

- Store exact **row count**, a **capped sample** (default ≤500 rows / ≤1MB),
  and **row fingerprints** (capped). Do not store unbounded result sets on
  the run document (MongoDB 16MB limit).

### Auth and roles

- New accounts default to **viewer**. Privilege escalation is an explicit
  admin action.
- Non-admin script create/edit/delete goes through **approval** when review
  is enabled. Do not bypass approval in "convenience" APIs.

### Agent / MCP

- MCP tools operate with the caller's permissions only.
- Destructive or privileged actions (approve as admin, manage data sources,
  change roles) must not be exposed as unconstrained tools.
- Machine-oriented outputs must remain stable (see Public contracts).

## Public contracts

Treat these as API surface:

| Contract | Stability rule |
|----------|----------------|
| Check outcome enum | `clean` \| `issues` \| `error` (do not rename casually) |
| Run document shape | count + sample + fingerprints + outcome + timing |
| Alert event types | outcome changes, new rows, recovery, broken query |
| `GET /api/health` | Public, no auth. `200` = ok, `503` = degraded. Reports component name/status/latency only — never internals or error details |
| Scheduler heartbeat | Only a scheduled `scripts/run-all-scripts.ts` run writes it; health reports `stale` when no scheduled run started in the last 12 hours (`HEARTBEAT_STALE_MS`) |
| Dead-letter API | `GET /api/notifications/deliveries/failed` + `POST .../requeue`, guarded by `NOTIFICATION_MANAGE` |
| Sentry | `@sentry/nextjs` v11, `withSentryConfig` imported from `@sentry/nextjs/config`. No DSN = SDK disabled. Error tracking only: no tracing, no replay, `sendDefaultPii` off. Never send raw pg error fields (`detail`, `hint`, `internalQuery`) |
| Structured logs | One JSON object per line; request id via `runWithRequestId`. Never log secrets/PII in full |
| MCP tool names and args | Additive changes preferred; breaking changes need migration notes |
| Cron / scheduled runner | GitHub workflow `.github/workflows/sql-check-cron.yml` runs `npx tsx scripts/run-all-scripts.ts "$EXECUTION_MODE"`; `npm run sql:run-scheduled` is the local equivalent. `CRON_SECRET` (Bearer) guards `POST /api/notifications/dispatch` |
| Env var names in `.env.example` | Document every new required var |

In any machine/JSON mode: **stdout carries one result object** (or a
documented stream). Status noise goes to logs/stderr, not mixed into the
payload.

## Architecture rules

1. **Routes are thin.** Parse input, call a service, map errors. Business
   logic does not live in route handlers.
2. **Services own use cases.** `runCheck`, approval apply, notification
   dispatch, batch orchestration live under `server/services/`.
3. **Repos own persistence.** No ad-hoc Mongo access scattered through routes.
4. **Domain is pure.** Outcome transitions, diff rules, schedule parsing
   helpers that are logic-only stay testable without I/O.
5. **One pool registry for data sources.** Added sources are keyed by
   id/version; editing a source invalidates pools and schema cache.
6. **Notification outbox.** Prefer durable outbox / idempotent send over
   fire-and-forget when changing alert paths.

See `docs/architecture.md` for Today → Target detail. When you complete a
Target item, update that doc in the same change.

## Verification expectations

| Change type | Minimum proof |
|-------------|----------------|
| Domain rule (outcome, diff, schedule) | Unit tests in isolation |
| `runCheck` / lease / fencing | Integration-style test or scripted scenario with real Mongo + Postgres when feasible |
| SQL validator | Cases for blocked writes, allowed SELECT/WITH/EXPLAIN, quoted side-effect names |
| Data source save/test | SSRF rejection cases; secrets not echoed |
| Alert channel | Idempotent behavior documented; test send path not broken |
| API contract / MCP tool | Type/schema test; authz negative case |
| Observability (log/health/Sentry) | Unit test where possible; no secret/PII in output |
| UI only | Existing visual/unit coverage; no server invariant weakened |

Do not silence a failing check by raising timeouts, skipping tests, or
broadening permissions without a written reason in the PR.

## Hotspot map

Historical risk areas. Touching these requires extra care and matching tests.

| Hotspot | Paths (approx.) | Regression risk |
|---------|------------------|-----------------|
| Read-only enforcement | `lib/sql/*`, datasource execute path | Writes slip through; timeout bypass |
| Lease / fencing | `runCheck` service, check `lease` fields | Double runs; stale run overwrites state |
| Result sampling | run persistence | 16MB document failures; wrong counts |
| Data source secrets | crypto + data_sources repo | Secret leakage in API/logs |
| SSRF / DNS rebinding | datasource connection guard, `server/net` | Access to metadata/internal hosts |
| Approval flow | check change + approval services | Privilege bypass; unreviewed SQL live |
| Alert dispatch | notify + outbox | Duplicate storms; silent drop |
| MCP authz | `server/mcp/*` | Agent performs admin actions |
| Cron entry | scheduled runner + `CRON_SECRET` | Unauthorized trigger; missed runs |
| Scheduler slot claims | `run-checks.ts` claim/release | Silent slot loss on hard kill |

## Debugging

1. Confirm **root cause** before fixing — especially regressions ("it used
   to work").
2. If the cause is unknown, first make the failure **observable** (log with
   `requestId`/`checkId`/`runId`, metric, or failing test), then fix what
   the evidence shows.
3. Prefer one failure mode per change. Do not bundle drive-by refactors
   into a production bugfix.
4. For production incidents, check in order: lease contention → Postgres
   timeout/connectivity → Mongo write → alert delivery → cron trigger auth.

## Documentation duties

Update docs in the **same change** when you alter:

| Change | Doc |
|--------|-----|
| Run pipeline, concurrency, layers | `docs/architecture.md` |
| Collections, indexes, retention | `docs/database.md` |
| Auth providers, roles | `docs/authentication.md` |
| Channels, payload shape | `docs/notifications.md` |
| Tools, OAuth, API keys | `docs/mcp.md` |
| Env vars, deploy, smoke test | `docs/deployment.md` |
| CLI entry points | `scripts/README.md` |
| Invariants, contracts, hotspots | `docs/engineering.md` |

User-facing `/docs` in the app (EN/ZH) must stay consistent with behavior
changes that operators see.

## Product north star

When choosing what to build next, prefer in order:

1. **Reliability** — scheduling, leases, retries, no silent missed runs
2. **Observability** — structured logs, health/readiness, basic metrics
3. **Safety** — read-only, secrets, SSRF, authz
4. **Operator UX** — clear failures, approval, alert quality
5. **New features** — extra engines, channels, AI flourishes

Assay wins by being a check system teams can leave on overnight — not by
accumulating surface area.
