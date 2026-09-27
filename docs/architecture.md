# Architecture

This is the target architecture for Assay and the plan for getting there from
today's code. Each phase ships on its own and keeps the app working.

## Constraints

- **Runtime:** Next.js App Router on Vercel Functions (Fluid Compute). Many
  short-lived instances share nothing in memory; anything that must survive a
  request or be seen by another instance lives in MongoDB or Redis.
- **Stores:** MongoDB Atlas holds Assay's own data. The monitored database is
  PostgreSQL, reached read-only. Upstash Redis holds counters and short caches.
- **Scheduling:** GitHub Actions (every 30 minutes) or a small always-on
  scheduler starts runs; Assay itself keeps no clock.
- **Open source and self-hosted:** everything must work with a single
  deployment and no managed queue. Managed services are optional adapters.

## What changes and why

| Today | Problem | Target |
|---|---|---|
| The executor (`scripts/core/sql-executor.ts`, 980 lines) lives in the CLI folder and mixes parsing, status rules and persistence | Hard to test, reused by path hacks, one change touches everything | `server/services/run-check.ts` over a `DataSource` interface; `scripts/` only holds CLIs that call services |
| Route handlers of 250–540 lines hold business logic | Logic is duplicated across routes and untestable without HTTP | Routes are thin adapters: parse input, call a service, map errors |
| A check's current state is rebuilt from run history on each request | The checks list, alerts and diffs all need it; rebuilding is slow and racy | The check stores its state (status, rows, since, last run), updated when a run finishes |
| Nothing stops the same check running twice at once | Manual and scheduled runs can overlap and write conflicting state | A per-check lease with a fencing token |
| Batch progress lives in process memory with a Redis fallback | On serverless, another instance cannot see it | Batches and their progress are MongoDB documents |
| Every returned row is stored on the run | A large result exceeds MongoDB's 16 MB document limit and the run is lost | Store the count, a capped sample and row fingerprints |
| Status is "failure" / "attention_needed" | "Failure" means the query broke, which reads like "found problems" | `error` / `issues` / `clean` in the domain and UI |
| About 3,000 lines of unused "enhanced" modules | Noise for readers and reviewers | Removed once nothing imports them |

## Module layout

```
src/
  domain/        Pure types and rules: run outcome, check state, diffs,
                 schedules, notifications, digests. No I/O, unit-tested.
  server/
    services/    Use cases: runCheck, batches, checks read model,
                 notifications dispatcher, alert controls, destinations.
    repos/       MongoDB access for runs, checks state and the outbox.
    runs/        Run history queries and the legacy response shape.
    datasource/  The checked database (PostgreSQL), read-only.
    notify/      Channels (Slack, Discord, Telegram, Feishu, WeCom, webhook),
                 SSRF guard, sending.
    integrations/ OAuth installs and chat-app callbacks.
    mcp/         MCP server: caller, tools, permissions.
    http/        withAuth and route helpers.
    crypto/      Sealed secrets (AES-256-GCM).
    concurrency/ Semaphore for bounded parallel runs.
  lib/           Older shared code: auth (Better Auth, RBAC), database
                 (Mongo client, indexes, Postgres pool), SQL validation,
                 approval and version workflows, cache, utilities.
  contracts/     zod schemas for API input and output, shared with the client.
  client/        Typed fetch helpers and hooks.
  app/           Routes. API routes are thin adapters over services.
  components/
    ui/          Primitives (button, dialog, table...).
    layout/      App shell, sidebar, page header, the Runs page.
    checks/ activity/ notifications/ settings/ auth/   Feature views.
    business/    Views carried over from the first version, each split into
                 a pure module (tested), a data hook and section components:
                 analysis, approvals, dashboard (run panel), edit-history,
                 scripts, users, ai.
scripts/         CLIs (seed, run checks, migrations) calling the same code.
```

Dependencies point inward: pages → components → client on the browser side,
`app/api → server/http → server/services → server/repos, domain` on the
server. `domain` imports nothing from the app.

## Data model

MongoDB collections. Existing names are kept where a rename would only add a
migration; new fields are added alongside old ones and back-filled.

**checks** (today `sql_scripts`)

```
{ scriptId, name, description, sql, tags, schedule,
  workspaceId, connectionId,          // "default" / "primary" until multi-tenant
  version,                            // optimistic concurrency for edits
  state: { status, rowCount, since, lastRunId, lastRunAt, previousRowCount },
  lease: { runId, until } | null }
```

**runs** (today `result`)

```
{ checkId, trigger: schedule | manual | batch | api, triggeredBy,
  startedAt, finishedAt, durationMs,
  status: error | issues | clean, rowCount,
  sample: first 500 rows, columns,
  rowKeys: fingerprints of up to 5,000 rows,  // for new / still / fixed
  error, aiTriage }
```

Indexes: `{ checkId: 1, startedAt: -1 }`, `{ startedAt: -1 }`, and a TTL on
`startedAt` for retention (configurable, 90 days by default).

**events**: the activity feed and the notification outbox in one.

```
{ _id, type: check.status_changed | check.edited | check.approved | ...,
  checkId, runId, from, to, at, actor,
  deliveries: { slack: { at, ok } } }
```

A unique index on `(type, runId)` makes writing an event idempotent.

**batches**: `{ requestedBy, checkIds, done, failed, startedAt, finishedAt }`.

## Running a check

`runCheck(checkId, trigger)` is the only way a check runs, whether it is
started by a person, the schedule, a batch, or an agent.

1. **Lease.** `findOneAndUpdate` sets `lease = { runId, until }` only when
   there is no live lease. If a run is already in progress, the caller gets
   that run's id instead of starting a second one.
2. **Execute** through the check's `DataSource`: a read-only transaction,
   `statement_timeout`, and a row cap. Each instance limits concurrent
   executions (a small semaphore) so a burst cannot exhaust the PostgreSQL
   connection pool.
3. **Record** the run: count, capped sample, row fingerprints, duration.
4. **Transition.** Compare with the check's previous state and update it
   with the lease's `runId` as a fencing token: a run whose lease expired
   cannot overwrite a newer result. When the status or the set of rows
   changes, write an event.
5. **Release** the lease.

**Read-only, in layers.** A check's SQL passes the static validator
(`src/lib/sql/read-only-validator.ts`): no write or DDL keywords, no
side-effecting functions (also when their names are quoted), and every
statement must start with SELECT, WITH, EXPLAIN or DO, so a bare `END` cannot
close the transaction. Each statement is then sent on its own over the
extended protocol, where PostgreSQL refuses a second statement, inside
`BEGIN READ ONLY` with a `statement_timeout`. The strongest layer is the
database itself: point `DATABASE_URL` at a role that can only SELECT, e.g.

```sql
CREATE ROLE assay_reader LOGIN PASSWORD '...';
GRANT USAGE ON SCHEMA public TO assay_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO assay_reader;
ALTER ROLE assay_reader SET default_transaction_read_only = on;
ALTER ROLE assay_reader SET statement_timeout = '60s';
```

`runDueChecks` claims each due slot atomically (already in place) and runs
the claimed checks with bounded concurrency. `runBatch` records a batch
document and processes its checks the same way; progress is read from
MongoDB, so any instance can report it.

## Concurrency rules

- **One run per check at a time:** the lease above. Leases expire, so a
  crashed instance never blocks a check for long.
- **No lost updates on edits:** saving a check must send the `version` it was
  based on (`428` without one); a stale version gets `409 Conflict` before
  anything is written or sent for approval, and the UI offers to reload.
  Because only one save per version succeeds, version records
  (`script_versions`) are created one at a time too.
- **Idempotent side effects:** events are unique per run, and deliveries
  record what was sent, so retries never notify twice.
- **Bounded work per instance:** a semaphore around query execution, and
  small connection pools sized for serverless.
- **Rate limits:** Redis fixed windows (AI, demo runs), failing closed where
  the limit protects shared resources.

## Background work

The job runner is an interface with an inline implementation: work runs in
the request or right after the response with `after()`. The notification
dispatcher reads undelivered events and sends them; it is started after each
run and by the scheduled tick, so a missed delivery is retried. A managed
queue can replace the inline runner later without changing services.

## API conventions

- Input and output are zod schemas in `src/contracts`, parsed at the edge of
  every route and reused by the client for types.
- Errors are `{ error: { code, message } }` with the matching HTTP status.
- Lists use cursor pagination.
- Every route declares its permission through `withAuth`; guests are opt-in
  per route.

## Front end

- Routes follow the information architecture: `/checks`, `/checks/[id]`,
  `/checks/new`, `/activity`, `/coverage`, `/settings/*`. Old routes redirect.
- Server components render the shell; interactive views are client
  components that fetch through query hooks, with caching and revalidation
  instead of hand-written effects.
- One set of design tokens (CSS variables) for light and dark, and a small
  set of primitives: button, pill, table, tabs, sparkline, empty state.

## Extension points

- **DataSource:** `runReadOnly(sql, { timeoutMs, maxRows })`. PostgreSQL
  today; MySQL, BigQuery or Snowflake later as adapters.
- **Channel:** `request(message, secret)` and `interpretOk(body)` in
  `src/server/notify/channels/`. A new service is one file and an entry in
  `CHANNELS`; the outbox, retries and settings page need no change.
- **Agents:** the MCP server (`/api/mcp`, [mcp.md](mcp.md)) exposes the same
  services with the same permissions: each tool declares the permission it
  needs, and a request only sees the tools its API key's owner may use.
- **Workspaces:** new documents (events, destinations, deliveries) carry
  `workspaceId`; older ones without it belong to the default workspace.
  Routes resolve the workspace through `workspaceOf(principal)` and pass it
  to the repositories, so multi-tenant access control is a change there, not
  a rewrite.

## Phases

1. **Design system and shell.** Tokens from the prototype, sidebar layout,
   new routes with redirects. Existing features keep working inside it.
   *Done (PRs #34, #35).*
2. **Server foundation.** `server/` layout, `withAuth`, contracts, the
   `DataSource` interface; move the executor into `runCheck` with the
   lease, row cap and fingerprints; migrate runs and back-fill check state.
   *Done: domain rules, `withAuth` and the statement splitter (#36);
   `runCheck`, `runChecks` and the MongoDB store (#37); batches in MongoDB
   run with `after()`, and `scripts/backfill-check-state.ts`.*
3. **Checks list and detail on real state.** Status groups, 30-run history,
   new / still / fixed diffs.
4. **Events and notifications.** Activity feed, Slack notifier, outbox
   dispatcher. *Done: an outbox of deliveries (unique per event and
   destination, claimed atomically, retried with backoff) and channels for
   Slack, Discord, Telegram, Feishu, WeCom and signed webhooks; one-click
   Slack and Discord through OAuth and Telegram through a deep link; secrets
   sealed with AES-256-GCM. See [notifications.md](notifications.md).*
5. **Own sign-in.** Better Auth with Google and GitHub, users in MongoDB;
   Clerk roles move over on the first verified sign-in. *Done
   ([authentication.md](authentication.md)).*
6. **MCP server.** Personal API keys and `/api/mcp` with read, run and
   alert tools. *Done ([mcp.md](mcp.md)).*
7. **Clean-up.** Remove legacy modules and pages, add end-to-end tests for
   the main flows. *In progress: dead code removed (#61); the oversized
   legacy pages split into tested modules, hooks and sections (#82, #84,
   #87–#89, #91); run readers moved to the new fields and the retired
   fields no longer written (#80, #90); API route tests (#83). End-to-end
   tests remain.*
