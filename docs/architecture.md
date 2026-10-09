# Architecture

How Assay is built: the layers, how a check runs, data sources, and the API
conventions. Collections and indexes are in [database.md](database.md); the
invariants are in [engineering.md](engineering.md).

## Constraints

- **Runtime:** Next.js App Router on Vercel Functions with Fluid Compute
  (`"fluid": true` in `vercel.json`; routes that run checks set
  `maxDuration = 300`, which Hobby accepts only with Fluid on). Instances
  share nothing in memory: anything that must outlive a request or be seen
  by another instance lives in MongoDB or Redis.
- **Stores:** MongoDB holds Assay's own data. The monitored databases are
  PostgreSQL data sources, reached read-only: `DATABASE_URL` (the built-in
  `default`) and any an admin adds. Upstash Redis holds counters and short
  caches.
- **Scheduling:** Assay keeps no clock. A QStash schedule (or any cron)
  calls `POST /api/cron/run-scheduled`; a GitHub Actions workflow is the
  fallback ([deployment.md](deployment.md#scheduled-runs)).
- **Self-hostable:** everything works as one deployment with no managed
  queue; managed services are optional adapters.

## Module layout

Dependencies point one way, and ESLint (`no-restricted-imports` in
`eslint.config.mjs`) refuses the others:

- `domain` imports nothing from the app: no `server`, `lib`, `app`,
  `components`, `next` or database drivers.
- `lib` does not import `server`, `app` or `components`.
- `components` and `client` do not import `server` or the server-only parts
  of `lib` (database, auth server, workflows).
- API routes never call `db.collection(...)`: data access lives in
  `server/services` and `server/repos`.

Browser side: pages → components → client. Server side:
`app/api → server/http → server/services → server/repos, domain`.

```
src/
  domain/        Pure types and rules: outcomes, check state, diffs,
                 schedules, notifications, digests. No I/O.
  server/
    services/    Use cases: runCheck, batches, the checks read model, check
                 changes (applied or filed for review), approvals, the
                 notification dispatcher, alert controls, destinations.
    repos/       MongoDB access: runs, check state, approval requests, the
                 notification outbox.
    runs/        Run history, the run report, samples and fingerprints.
    datasource/  The DataSource adapter (PostgreSQL), the pool registry and
                 the connection guard (private hosts, TLS, DNS rebinding).
    notify/      Channels (Slack, Discord, Telegram, Feishu, WeCom, webhook).
    integrations/ OAuth installs and chat-app callbacks.
    mcp/         MCP server: caller, tools, permissions.
    http/        withAuth, ApiError, the AI guard, paging, route helpers.
    crypto/      Sealed secrets (AES-256-GCM).
    concurrency/ Semaphore for bounded parallel runs.
  lib/           Infrastructure: config (env registry, serverEnv), logging,
                 net (SSRF guard, pinned fetch), auth (Better Auth, RBAC),
                 database (Mongo client, indexes, Postgres pool), SQL
                 validation, edit history and versions, cache, utilities.
  contracts/     API input and output types shared with the client (zod
                 schemas for check input, alerting and notifications).
  client/        Typed fetch helpers and `useApi`.
  app/           Routes; API routes are thin adapters over services.
  components/    ui/ primitives, layout/ (shell, sidebar, page header), and
                 one folder per feature, each split into a tested pure
                 module, a data hook, section components and an EN/ZH copy
                 file.
scripts/         CLIs calling the same services (scripts/README.md).
```

## Running a check

`runCheck(checkId, trigger)` is the only way a check runs, whoever starts
it: a person, the schedule, a batch or an agent.

1. **Lease.** `findOneAndUpdate` sets `lease = { runId, until }` only when
   there is no live lease. If a run is in progress the caller gets its id
   instead of a second run.
2. **Execute** through the check's `DataSource` (resolved by the registry
   from `dataSourceId`) in a read-only transaction. Each instance runs at
   most `CHECK_CONCURRENCY` (4) checks at once so a burst cannot exhaust the
   pool; the lease is renewed when a slot frees up, and a run whose lease
   was taken meanwhile stops without querying. `CHECK_TIMEOUT_MS` (30 s,
   clamped to 1–255 s so a run, its save and its alert fit in one 300 s
   function) is one deadline for the whole script: each statement's
   `statement_timeout` is the time left. Rows are read through a cursor; at
   most 5,000 are kept and the rest only counted, so the count stays exact.
3. **Record** the run: exact count, a sample (≤500 rows, ≤1 MB),
   fingerprints of the kept rows, duration.
4. **Transition.** Compare with the previous state and update it using the
   lease's `runId` as a fencing token, so an expired run cannot overwrite a
   newer result. A change of status or rows puts its event on the check in
   the same update (`pendingEvents`); it is then written to `events` and
   removed, and if the process dies in between, the next run or dispatch
   writes it.
5. **Release** the lease.

`runDueChecks` claims each due schedule slot atomically and runs the claimed
checks with bounded concurrency. `runBatch` records a batch document and
processes its checks the same way; progress is read from MongoDB, so any
instance can report it. A batch runs inside one function (`maxDuration`
300 s): a check starts only while a whole run still fits before the
deadline, the rest are marked `skipped`, and alerts go out in the 30 s kept
back.

### Read-only, in layers

1. The static validator (`src/lib/sql/read-only-validator.ts`): no write or
   DDL keywords, no side-effecting functions (quoted names included), and
   every statement starts with SELECT, WITH, EXPLAIN or DO, so a bare `END`
   cannot close the transaction.
2. Each statement is sent alone over the extended protocol (which refuses a
   second statement) inside `BEGIN READ ONLY` with a `statement_timeout`.
3. The strongest layer is the database: point `DATABASE_URL` and every data
   source at a SELECT-only role, created with SQL as the database owner:

```sql
CREATE ROLE assay_readonly LOGIN PASSWORD '...';
GRANT USAGE ON SCHEMA public, demo TO assay_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public, demo TO assay_readonly;
ALTER ROLE assay_readonly SET default_transaction_read_only = on;
ALTER ROLE assay_readonly SET statement_timeout = '60s';
```

On Neon, a role made in the console joins `neon_superuser`, which carries
`pg_write_all_data`, so it is not read-only whatever its grants say.
`SELECT pg_has_role('assay_readonly', 'pg_write_all_data', 'USAGE')` must
return false. `npm run seed:demo` recreates the `demo` schema through
`SEED_DATABASE_URL` and restores `assay_readonly`'s grants when the role
exists.

## Data sources

A check runs against the source named by `dataSourceId`; without one it
uses `default`, the built-in source from `DATABASE_URL` (shown in Settings
as coming from the environment, never edited or deleted there, absent when
`DATABASE_URL` is unset). Admins add more under Settings → Data sources
(`datasource:manage`); anyone who reads checks may list names, ids, engines
and `display` (demo guests get no `display`). PostgreSQL is the only engine.

- **Registry** (`src/server/datasource/registry.ts`) resolves a source id
  for checks, dry runs and the schema browser. One pool per added source per
  instance (`PG_SOURCE_POOL_MAX`, 3), keyed by the source's `version`: after
  an edit the next resolve opens a new pool and ends the old one. Records
  are cached for 5 s. The built-in source keeps its own pool and TLS
  settings (`CA_CERT_BLOB_URL` …). `CHECK_CONCURRENCY` is shared by all
  sources.
- **Schema** (`/api/schema?source=`, coverage, AI helpers) is cached in
  Redis per source and version (`db_schema:v3:<id>:<version>`). Dry runs
  and AI drafts use the editor's selected source; triage uses the check's.
- **Secrets.** The connection string is sealed with `ASSAY_SECRET_KEY`
  before it is stored, never returned (pages get `display`) and never
  logged; pool logs name only the source id, and not even that in public CI
  logs.
- **SSRF.** Saving or testing resolves the host and refuses private,
  loopback and link-local addresses (and names like `localhost`,
  `*.internal`) unless `ALLOW_PRIVATE_DATA_SOURCES=true`. Every connection
  resolves the host again through a lookup that refuses private addresses,
  so DNS rebinding cannot connect; pg still sees the host name, so TLS sends
  it as SNI (Neon routes by it) and verifies the certificate against it.
  Only URL connection strings with `sslmode`, `channel_binding`,
  `application_name`, `options` and `connect_timeout` are accepted:
  `host`/`hostaddr` would bypass the check and certificate-file parameters
  would read the server's disk.
- **TLS.** Verified TLS (chain and host name) is required and applied when
  `sslmode` is missing. `sslmode=disable`, `allow` and `no-verify` are
  accepted only for a private host with private hosts allowed.
- **Test.** `POST /api/data-sources/test` (unsaved) and
  `/api/data-sources/[id]/test` connect once (5 s), read the server version
  and role, and check inside `READ ONLY` whether the role could write
  (superuser, `pg_write_all_data`, table write privileges, `CREATE` on the
  database), warning when it could. Six tests per person per minute.
- **Deleting** a source is refused (409 `source_in_use`) while checks use
  it; a pending change request naming a deleted source fails to apply.

## Concurrency

- **One run per check:** the lease. Leases expire, so a crashed instance
  never blocks a check for long.
- **No lost edits:** a save sends the `version` it was based on (`428`
  without one); a stale version gets `409` before anything is written or
  filed for approval, and the UI offers to reload.
- **Idempotent side effects:** events are unique per run and deliveries
  record what was sent, so retries never notify twice.
- **Bounded work:** a semaphore around query execution and small pools
  sized for serverless.
- **Rate limits:** Redis fixed windows (AI, demo runs), failing closed
  where they protect shared resources.

Every race and how it is handled: [database.md](database.md#concurrency).

Background work runs inline, in the request or after the response with
`after()`. The notification dispatcher sends undelivered events after each
run and on each scheduled tick, so a missed delivery is retried.

## API conventions

- **Auth.** Every route declares who may call it through `withAuth`
  (`src/server/http/route.ts`): a permission, `{ anyOf: [...] }`, or
  `{ signedIn: true }` (`me`, and `run-check`, which checks
  `check:execute` itself because demo mode widens it). Guests are opt-in: a
  permission admits them only when it is in `GUEST_PERMISSIONS`
  (`check:read`, `history:read`), `signedIn` only with `allowGuest`.
  Refusals are 401 or 403. Routes with their own check: `auth/[...all]`
  (Better Auth), `mcp` (API key or OAuth token), `cron/run-scheduled` (QStash
  signature or `CRON_SECRET`), `notifications/dispatch` (`CRON_SECRET`),
  the Slack and Telegram
  callbacks (signatures). A test fails on a route that is neither wrapped
  nor on the reviewed allowlist.
- **Checks and runs.**
  - `GET /api/checks`: every check with its state and last 30 runs;
    `GET /api/checks/[scriptId]`: one check's detail.
  - `GET /api/checks?view=definitions`: definitions with SQL and `version`.
    `POST /api/checks`, `PUT`/`DELETE /api/checks/[scriptId]` write.
  - `POST /api/batches` starts a bulk run (`{ mode, checkIds,
    filteredExecution }`, 202); `GET /api/batches/[executionId]` reports
    progress.
  - `GET /api/check-history`: runs, filtered and paged;
    `check-history/stats` counts them; `execution-details/[resultId]` is one
    run's report.
  - Deprecated aliases with their old shapes, answering with `Deprecation`
    and a `Link` to the successor: `/api/scripts`, `/api/scripts/[scriptId]`,
    `/api/run-all-scripts`, `/api/batch-execution-status`.
- **Input.** JSON bodies are parsed with a zod schema (`parseJson`); an
  invalid one gets 400 `invalid_input` with the issues. Query strings go
  through small parsers that refuse unknown values.
- **Errors.** Every route answers `{ error: { code, message } }`: a handler
  throws `ApiError(status, code, message)` and `withAuth` shapes it;
  anything else becomes a logged 500 `internal` that reveals nothing. The
  `message` is English; the stable `code` is translated by the UI
  (`src/client/api-errors.ts`). Exceptions are protocol shapes: JSON-RPC
  errors on `/api/mcp` and empty 401s to chat-app callbacks.
- **Paging.** `activity` uses cursors (the target for every list).
  `check-history`, `edit-history` and `approvals` page by `page` and
  `limit` (`check-history` up to 500 runs a page, without rows). The first
  two count at most 10,000 matches (`totalCapped`, shown as "10000+"), use
  collection metadata when unfiltered, and never start a page past the count
  (`src/server/http/paging.ts`).
- **Response size.** Vercel refuses responses over 4.5 MB. A response
  carries at most two run samples, each trimmed to 1 MB (`responseSample`);
  lists never carry samples or fingerprints.

## Front end

- Routes: `/checks`, `/checks/[scriptId]`, `/checks/new`, `/checks/manage`
  (with `/checks/manage/history`), `/approvals`, `/activity`, `/runs`
  (`?search=`), `/runs/[runId]`, `/coverage`, `/data-analysis`,
  `/settings/notifications`, `/settings/data-sources`,
  `/settings/api-keys`, `/admin/users`. Old URLs redirect permanently
  (`src/lib/legacy-redirects.mjs`).
- Server components render the shell; interactive views are client
  components fetching with `useApi` (`src/client/use-api.ts`), a plain
  `useEffect` fetch with abort and `reload()`: no cache or deduplication.
- Styling follows [DESIGN.md](../DESIGN.md).

## Extension points

- **DataSource:** `runReadOnly(statements, { timeoutMs, maxRows })`. Another
  engine is a value of `engine`, an adapter and a branch in the registry's
  pool factory.
- **Channel:** `request(message, secret)` and `interpretOk(body)` in
  `src/server/notify/channels/`: one file and an entry in `CHANNELS`; the
  outbox, retries and settings page need no change.
- **Agents:** the MCP server ([mcp.md](mcp.md)) calls the same services
  with the same permissions.
- **Workspaces:** events, destinations, deliveries and data sources carry
  `workspaceId` (none means `default`). Routes resolve it with
  `workspaceOf(principal)` and pass it to the repos, so multi-tenant access
  control is a change there, not a rewrite.
