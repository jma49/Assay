# Architecture

This is the target architecture for Assay and the plan for getting there from
today's code. Each phase ships on its own and keeps the app working.

## Constraints

- **Runtime:** Next.js App Router on Vercel Functions with Fluid Compute
  (`"fluid": true` in vercel.json; routes that run checks set `maxDuration =
  300`, which Hobby only accepts with Fluid on). Many
  short-lived instances share nothing in memory; anything that must survive a
  request or be seen by another instance lives in MongoDB or Redis.
- **Stores:** MongoDB Atlas holds Assay's own data. The monitored databases
  are PostgreSQL data sources, reached read-only: `DATABASE_URL` (the
  built-in `default`) and any an admin adds in Settings. Upstash Redis holds
  counters and short caches.
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
    services/    Use cases: runCheck, batches, checks read model, check
                 changes (create / edit / delete, applied or filed for
                 review), approvals, notifications dispatcher, alert
                 controls, destinations.
    repos/       MongoDB access: runs, run-check state, approval requests
                 and the notification outbox.
    runs/        Run history query, the run report, samples and row
                 fingerprints.
    datasource/  The checked databases: the DataSource adapter (PostgreSQL),
                 the registry of pools per source, and the connection guard
                 (private hosts, TLS, DNS rebinding).
    notify/      Channels (Slack, Discord, Telegram, Feishu, WeCom, webhook)
                 and sending.
    net/         SSRF guard: public-address checks and a pinned fetch, for
                 webhooks and CIMD client metadata (data sources reuse the
                 address check).
    integrations/ OAuth installs and chat-app callbacks.
    mcp/         MCP server: caller, tools, permissions.
    http/        withAuth, ApiError, the AI guard and route helpers.
    crypto/      Sealed secrets (AES-256-GCM): channel secrets and data
                 source connection strings.
    concurrency/ Semaphore for bounded parallel runs.
  lib/           Older shared code: auth (Better Auth, RBAC), database
                 (Mongo client, indexes, Postgres pool), SQL validation,
                 edit history and version records, cache, utilities.
  contracts/     API input and output types shared with the client; check
                 input, alerting and notifications are zod schemas, the
                 others (activity, checks, runs, schema) plain types.
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
  dataSourceId,                        // missing = "default" (DATABASE_URL)
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

**data_sources**: the databases added in Settings (see [Data sources](#data-sources)).

```
{ sourceId, name, engine: "postgres",
  connection,                          // sealed connection string, never returned
  display,                             // "user@host:port/db", what pages show
  createdBy, createdAt, updatedBy, updatedAt,
  version,                             // keys pools and schema caches
  lastTest: { ok, at, error, serverVersion, currentUser, readOnly, writeAccess } | null,
  workspaceId }
```

[database.md](database.md) lists every collection, field and index.

## Running a check

`runCheck(checkId, trigger)` is the only way a check runs, whether it is
started by a person, the schedule, a batch, or an agent.

1. **Lease.** `findOneAndUpdate` sets `lease = { runId, until }` only when
   there is no live lease. If a run is already in progress, the caller gets
   that run's id instead of starting a second one.
2. **Execute** through the check's `DataSource` (resolved from its
   `dataSourceId` by the registry) in a read-only transaction.
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
database itself: point `DATABASE_URL` (and every data source) at a role that
can only SELECT, e.g.

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

## Data sources

A check runs against one data source: `dataSourceId` names it, and a check
without one uses `default`, the built-in source from `DATABASE_URL` (shown
in Settings as coming from the environment; it is never edited or deleted
there, and is absent when `DATABASE_URL` is unset). Admins add more in
Settings → Data sources (`datasource:manage`, admin only); anyone who reads
checks may list their names, ids, engines and `display` (demo guests get no
`display`). PostgreSQL is the only engine; `engine` and the `DataSource`
interface leave room for others.

- **Registry** (`src/server/datasource/registry.ts`): resolves a source id
  to something checks, dry runs and the schema browser run on. One pg pool
  per added source per instance (`PG_SOURCE_POOL_MAX`, 3 by default), keyed
  by the source's `version`: after an edit the next resolve opens a new
  pool and ends the old one. Records are cached for 5 s, so another
  instance picks up an edit within that. The built-in source keeps its own
  pool and TLS settings (`CA_CERT_BLOB_URL` …). The per-process semaphore
  (`CHECK_CONCURRENCY`) is shared by all sources.
- **Schema** (`/api/schema?source=`, coverage, and the AI helpers) is
  cached in Redis per source and version (`db_schema:v3:<id>:<version>`).
  Dry runs and AI drafts use the source the editor has selected; triage uses
  the check's.
- **Secrets.** The connection string is sealed with `ASSAY_SECRET_KEY`
  (AES-256-GCM) before it is stored, never returned by an API (pages get
  `display`), and never logged; pool logs name only the source id, and not
  even that in public CI logs.
- **SSRF.** An admin types the host, so it could point at internal
  services or the cloud metadata endpoint. Saving or testing resolves the
  host and refuses private, loopback and link-local addresses (and names
  like `localhost`, `*.internal`) unless `ALLOW_PRIVATE_DATA_SOURCES=true`.
  Every connection then resolves the host again through a lookup that
  refuses private addresses (a socket handed to pg with that lookup), so a
  name that later resolves elsewhere (DNS rebinding) cannot connect. pg
  still sees the host name, so TLS sends it as SNI (Neon routes by it) and
  verifies the certificate against it. Only URL connection strings with
  `sslmode`, `channel_binding`, `application_name`, `options` and
  `connect_timeout` are accepted: `host`/`hostaddr` would bypass the check
  and the certificate-file parameters would read the server's disk.
- **TLS.** Verified TLS (certificate chain and host name, through
  `pgConnection`) is required, and applied when `sslmode` is missing.
  `sslmode=disable`, `allow` and `no-verify` are accepted only for a private
  host with private hosts allowed.
- **Test.** `POST /api/data-sources/test` (unsaved) and
  `/api/data-sources/[id]/test` connect once (5 s), read the server version,
  the role, and whether it could write (superuser, `pg_write_all_data`,
  write privileges on a table, `CREATE` on the database) inside `READ ONLY`,
  and warn when it could. Six tests per person per minute.
- **Deleting** a source is refused (409 `source_in_use`) while checks use
  it. A change request that names a source deleted while it waited fails
  to apply.

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

Auth, input and errors hold for every route. Cursor paging is the target;
the lists carried over from the first version still page by number.

- **Auth.** Every route declares who may call it through `withAuth`
  (`src/server/http/route.ts`): a permission, `{ anyOf: [...] }` (e.g.
  `approvals`, the GET of `users/roles`), or `{ signedIn: true }` for any
  signed-in user (`me`, `run-check`, which checks `check:execute` itself
  because demo mode widens it). Guests are opt-in: a permission lets them in
  only when it is in `GUEST_PERMISSIONS` (`check:read`, `history:read`),
  `signedIn` only with `allowGuest` (`me`, `run-check`). Refusals answer
  401 or 403 in the error shape below. Routes with their own
  check: `auth/[...all]` (Better Auth), `mcp` (API key),
  `notifications/dispatch` (`CRON_SECRET`), the Slack and Telegram callbacks
  (signatures).
- **Checks and runs.** One endpoint per job:
  - `GET /api/checks`: every check with its state and last 30 runs (the
    Checks list); `GET /api/checks/[scriptId]`: one check's detail.
  - `GET /api/checks?view=definitions`: every check's definition with its
    SQL and `version` (the Manage editor, the Runs page's check list and Run
    sheet, the Analysis page's names and tags). `POST /api/checks` and
    `PUT`/`DELETE /api/checks/[scriptId]` write checks.
  - `POST /api/batches` starts a bulk run (`{ mode, checkIds,
    filteredExecution }`, 202) and `GET /api/batches/[executionId]` reports
    its progress under check names. `/api/run-all-scripts` and
    `/api/batch-execution-status` are deprecated aliases with their old
    shapes.
  - `/api/scripts` and `/api/scripts/[scriptId]` are deprecated aliases with
    the old response shapes (`GET` a bare array). They answer with
    `Deprecation` and a `Link` to their successor; nothing in the app calls
    them.
  - `GET /api/check-history`: runs, filtered and paged (the Runs page's
    table; the Analysis page asks for up to 500 in a date range);
    `check-history/stats` counts them; `execution-details/[resultId]` is
    one run's report.
- **Input.** JSON bodies are parsed with a zod schema at the edge
  (`parseJson`); an invalid one answers 400 `invalid_input` with the
  issues. Query strings go through small parsers (`parseHistoryParams`,
  `parseEditHistoryQuery`) that refuse unknown values.
- **Errors.** Every route answers `{ error: { code, message } }` with the
  matching HTTP status: a handler throws `ApiError(status, code, message)`
  and `withAuth` turns it into that shape (`errorResponse`); anything else
  becomes a logged 500 `internal` that says nothing about internals. The
  `message` is English. The `code` is stable, and the UI shows it in the
  reader's language (`src/client/api-errors.ts`), falling back to the
  message for codes it does not know. The exceptions are protocol shapes:
  JSON-RPC errors on `/api/mcp` and empty 401s to chat-app callbacks.
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
  `/settings/notifications`, `/settings/data-sources`, `/settings/api-keys`,
  `/admin/users`. Static
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
  today; MySQL, BigQuery or Snowflake later as adapters: a value of
  `engine`, an adapter, and a branch in the registry's pool factory.
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
6. **MCP server.** `/api/mcp` with read, run and alert tools, for personal
   API keys and OAuth 2.1 sign-in: discovery, dynamic registration, Client
   ID Metadata Documents (CIMD, fetched behind the SSRF guard), a consent
   page with scopes, and Connected apps to disconnect. *Done
   ([mcp.md](mcp.md)).*
7. **Clean-up.** Remove legacy modules and pages, add end-to-end tests for
   the main flows. *In progress: dead code removed (#61); the oversized
   legacy pages split into tested modules, hooks and sections (#82, #84,
   #87–#89, #91); run readers moved to the new fields and the retired
   fields no longer written (#80, #90); API route tests (#83); one auth
   style and fewer duplicate endpoints (#102); one error shape, the check
   changes, approvals and runs moved behind services and repositories,
   the largest components split, knip in CI, and tests for the security
   and outbox modules (#157–#162).
   End-to-end tests remain.*
