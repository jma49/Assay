# Architecture

This is the target architecture for Assay and the plan for getting there from
today's code. Each phase ships on its own and keeps the app working.

## Constraints

- **Runtime:** Next.js App Router on Vercel Functions with Fluid Compute
  (`"fluid": true` in vercel.json; routes that run checks set `maxDuration =
  300`, which Hobby only accepts with Fluid on). Many
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
| The executor (a 980-line module in the CLI folder, since deleted) mixed parsing, status rules and persistence | Hard to test, reused by path hacks, one change touches everything | `server/services/run-check.ts` over a `DataSource` interface; `scripts/` only holds CLIs that call services |
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
  contracts/     API input and output types shared with the client; the
                 alerting and notifications contracts are zod schemas, the
                 others (activity, checks) plain TypeScript types.
  client/        Typed fetch helpers and `useApi`, a plain fetch hook
                 (no cache or deduplication).
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

MongoDB collections (see docs/database.md; `checks` and `runs` were renamed
from `sql_scripts` and `result`, which the app does on start).

**checks** (collection `checks`)

```
{ scriptId, name, description, sqlContent, hashtags, scope,
  isScheduled, cronSchedule,           // cron, UTC
  author, createdBy, updatedBy,
  version,                            // optimistic concurrency for edits
  state: { outcome, rowCount, previousRowCount, since, lastRunId, lastRunAt },
  lease: { runId, until } | null,
  alerting: { owner, mutedUntil, mutedBy, ack } }
```

**runs** (collection `runs`)

```
{ checkId, trigger: { kind: schedule | manual | batch | api, by },
  startedAt, finishedAt, durationMs,
  outcome: error | issues | clean, rowCount, columns,
  sample: at most 500 rows and 1 MB (UTF-8),
  rowKeys: fingerprints of up to 5,000 rows,  // for new / still / fixed
  diff, error, message, findings, expiresAt }
```

Indexes: `finishedAt`, `(checkId, finishedAt)`, `(outcome, finishedAt)`, and
a TTL on `expiresAt` (`RUN_RETENTION_DAYS`, 90 days by default).

**events**: the activity feed and the notification outbox's source.

```
{ type: check.outcome_changed | check.new_rows, checkId, runId,
  from, to, rowCount, diff, error, at, workspaceId }
```

A unique index on `runId` makes writing an event idempotent.

**batches**: `{ executionId, requestedBy, scripts: [{ scriptId, status, ... }],
totalScripts, startedAt, completedAt, isActive }`.

[database.md](database.md) lists every collection, field and index.

## Running a check

`runCheck(checkId, trigger)` is the only way a check runs, whether it is
started by a person, the schedule, a batch, or an agent.

1. **Lease.** `findOneAndUpdate` sets `lease = { runId, until }` only when
   there is no live lease. If a run is already in progress, the caller gets
   that run's id instead of starting a second one.
2. **Execute** through the check's `DataSource` in a read-only transaction.
   Each instance limits concurrent executions (a semaphore of
   `CHECK_CONCURRENCY`, 4 by default) so a burst cannot exhaust the
   PostgreSQL connection pool. When a slot frees up the lease is renewed,
   so time spent queueing does not eat into it; a run whose lease was taken
   meanwhile stops without querying. `CHECK_TIMEOUT_MS` (30 s by default,
   clamped to 1 s – 255 s so a run fits in one 300 s function with time to
   save it and send its alert) is one deadline for the whole script: each
   statement gets `statement_timeout` set to the time left. Rows are read
   through a cursor; at most 5,000 are kept per run and the rest are only
   counted, so the row count stays exact.
3. **Record** the run: exact count, a sample (500 rows, 1 MB at most),
   fingerprints of the kept rows, duration.
4. **Transition.** Compare with the check's previous state and update it
   with the lease's `runId` as a fencing token: a run whose lease expired
   cannot overwrite a newer result. When the status or the set of rows
   changes, the event goes onto the check in the same update
   (`pendingEvents`), is then written to `events` and removed; if the
   process dies in between, the next run or dispatch writes it.
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
CREATE ROLE assay_readonly LOGIN PASSWORD '...';
GRANT USAGE ON SCHEMA public, demo TO assay_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public, demo TO assay_readonly;
ALTER ROLE assay_readonly SET default_transaction_read_only = on;
ALTER ROLE assay_readonly SET statement_timeout = '60s';
```

Create the role with SQL as the database owner. On Neon, a role made in the
console joins `neon_superuser`, which carries `pg_write_all_data`, so it is
not read-only whatever its grants say; check with
`SELECT pg_has_role('assay_readonly', 'pg_write_all_data', 'USAGE')` (must be false).

`npm run seed:demo` recreates the `demo` schema through `SEED_DATABASE_URL`
and gives `assay_readonly` its grants back when that role exists.

`runDueChecks` claims each due slot atomically (already in place) and runs
the claimed checks with bounded concurrency. `runBatch` records a batch
document and processes its checks the same way; progress is read from
MongoDB, so any instance can report it. A batch runs inside one function
(`maxDuration` 300 s, the Hobby limit, on every route that runs checks): a
check starts only while a whole run still fits before the deadline, the
rest are marked `skipped`, and alerts are sent in the 30 s kept back.

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

These are the target conventions. The routes built on `server/` follow them;
the legacy routes are still being migrated and keep their own shapes.

- **Auth.** Every route declares who may call it through `withAuth`
  (`src/server/http/route.ts`): a permission, `{ anyOf: [...] }` (e.g.
  `approvals`, the GET of `users/roles`), or `{ signedIn: true }` for any
  signed-in user (`me`, `run-check`, which checks `script:execute` itself
  because demo mode widens it). Guests are opt-in: a permission lets them in
  only when it is in `GUEST_PERMISSIONS` (`script:read`, `history:read`),
  `signedIn` only with `allowGuest` (`me`, `run-check`). Refusals answer
  `{ success: false, message }` with 401 or 403. Routes with their own
  check: `auth/[...all]` (Better Auth), `mcp` (API key),
  `notifications/dispatch` (`CRON_SECRET`), the Slack and Telegram callbacks
  (signatures).
- **Checks and runs.** One endpoint per job:
  - `GET /api/checks`: every check with its state and last 30 runs (the
    Checks list); `GET /api/checks/[scriptId]`: one check's detail.
  - `GET /api/scripts`: every check's definition with its SQL and `version`
    (the Manage editor, the Runs page's check list and Run sheet, the
    Analysis page's names and tags). `POST /api/scripts` and
    `PUT`/`DELETE /api/scripts/[scriptId]` write checks.
  - `GET /api/check-history`: runs, filtered and paged (the Runs page's
    table; the Analysis page asks for up to 500 in a date range);
    `check-history/stats` counts them; `execution-details/[resultId]` is
    one run's report.
- **Input.** Target: parsed with a zod schema at the edge (`parseJson`).
  Only the alerting and notifications contracts are zod today.
- **Errors.** Target: `{ error: { code, message } }` with the matching HTTP
  status (`errorResponse`). Errors thrown out of a handler get it; the
  routes carried over from the first version still catch their own and
  answer `{ error: "..." }`, `{ message: "..." }` or
  `{ success: false, ... }`.
- **Paging.** Target: cursor pagination, as `activity` does. `check-history`,
  `edit-history` and `approvals` page by `page` and `limit` (`check-history`
  up to 500 runs a page, without their rows). `check-history` and
  `edit-history` count at most 10,000 matches (`totalCapped` beyond; the UI
  shows "10000+"), use the collection's metadata when unfiltered, and no page
  starts past the count (`src/server/http/paging.ts`).
- **Response size.** Vercel refuses responses over 4.5 MB. A response carries
  at most two run samples (a check's page: the latest run and the one
  before), each trimmed to 1 MB of UTF-8 (`responseSample`); lists never
  carry samples or row fingerprints.

## Front end

- Routes: `/checks`, `/checks/[scriptId]`, `/checks/new` (new check),
  `/checks/manage` (Manage, with `/checks/manage/history` for edit history),
  `/approvals`, `/activity`, `/runs` (accepts `?search=`), `/runs/[runId]`
  (a run's full report), `/coverage`, `/data-analysis`,
  `/settings/notifications`, `/settings/api-keys`, `/admin/users`. Static
  segments win over `[scriptId]`, so `/checks/new` and `/checks/manage` are
  their own pages. The old URLs (`/dashboard`, `/view-execution-result/:id`,
  `/scripts/new`, `/manage-scripts`, `/manage-scripts/edit-history`,
  `/manage-scripts/approvals`) and `/docs/menu-bar-and-dock` redirect
  permanently; the list is `src/lib/legacy-redirects.mjs`.
- Server components render the shell; interactive views are client
  components. They fetch with `useApi` (`src/client/use-api.ts`), a plain
  `useEffect` fetch with abort and `reload()`: no cache, deduplication or
  revalidation. A query library is a later step.
- One set of design tokens (CSS variables) for light and dark, and a small
  set of primitives: button, pill, table, tabs, sparkline, empty state.

## Extension points

- **DataSource:** `runReadOnly(statements, { timeoutMs, maxRows })`. PostgreSQL
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
   fields no longer written (#80, #90); API route tests (#83); one auth
   style and fewer duplicate endpoints (#102). End-to-end tests remain.*
