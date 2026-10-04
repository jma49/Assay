# Roadmap

Infrastructure and reliability goals for Assay. It sets no dates. A goal is
complete when all its acceptance checks pass; mark it **Done** with the PR.

Assay has one maintainer and one production deployment (`main` → Vercel, no
staging). Goals are sized for that: a goal that needs a second person or a
paid service is out of scope until one exists.

## Done

- **Observability** (#207, #222): Sentry with release and environment tags,
  pg error fields scrubbed; structured JSON logs with a request id, secrets
  scrubbed; public `GET /api/health` (MongoDB, Redis, default data source,
  scheduler).
- **Alert delivery guarantees** (#207, #222): six attempts, throttled
  attempts included; exhausted deliveries stay failed with the reason;
  admins list and requeue them.
- **Branch protection**: a ruleset on `main` blocks direct pushes and force
  pushes and requires the `verify` check (audit, typecheck, lint, knip,
  tests, build).
- **Scheduler slot safety** (#222): a run killed mid-slot no longer drops the
  slot; a heartbeat failure no longer aborts the run.
- **Reliable schedule trigger** (#229, #230): a QStash schedule calls
  `POST /api/cron/run-scheduled` every 30 minutes (signed; `CRON_SECRET`
  for other crons). GitHub's cron, which really fired about five times a
  day, is the fallback. Sentry Cron monitors `scheduled-checks-trigger`
  (15-minute margin) and `scheduled-sql-checks` (12 hours) alert on missed
  runs.
- **Scheduled runs use added data sources**: the `ASSAY_SECRET_KEY`
  repository secret is set.
- **Engineering guard rails** (#231–#248): one name for checks across API,
  permissions and code (`/api/scripts` kept as a deprecated alias); one
  environment registry read through `serverEnv()`; structured logs only on
  the server; layering, promise and env rules in ESLint; coverage floors
  and guest-flow e2e tests in CI; CodeQL; a Node 22 job.
- **Frontend error tracking** (#227): the browser SDK loads under
  Turbopack (`src/instrumentation-client.ts`), `onRequestError` reports
  server errors, the error boundary and `global-error.tsx` report render
  errors.
- **Default-deny API routes** (#224): a test fails when a route handler is
  not wrapped in `withAuth` and not on the reviewed allowlist.
- **Integration tests and SBOM in CI** (#224): a MongoDB service runs the
  integration suites; each push to `main` uploads a CycloneDX SBOM.
- **Delivery retention** (#225): the TTL keys on `updatedAt`, stamped on
  every write.
- **Fail closed on missing configuration** (#226): a production server
  exits on start without `BETTER_AUTH_SECRET`, `MONGODB_URI`,
  `DATABASE_URL` or `APP_URL`; optional features warn once each.
- **Runbooks** (#222): rollback (`docs/deployment.md`), backup and restore
  (`docs/backup-restore.md`), `ASSAY_SECRET_KEY` rotation and recovery
  (`docs/secret-rotation.md`).

## P0 — Close live gaps

### Lower the scheduler alert limits

Goal: A dead schedule reaches the maintainer within an hour.

- Once the QStash trigger has run on time for a few days,
  `HEARTBEAT_STALE_MS` drops from 12 hours to about one, so
  `GET /api/health` shows a dead schedule within the hour.
- The Sentry monitor `scheduled-checks-trigger` already alerts within 15
  minutes of a missed call; its alert is turned on in Sentry.

### Read-only monitored database (maintainer action)

Goal: No check, bug or leaked credential can write to the monitored database.

- No app or CI secret holds a role that can write: `DATABASE_URL` (Vercel,
  GitHub secret, `.env.local`) uses `assay_readonly` with only SELECT,
  `default_transaction_read_only = on` and a statement timeout
  ([architecture.md](architecture.md#running-a-check)).
- Settings → Data sources → Test on the default source reports it as
  read-only (the probe already checks superuser, `pg_write_all_data`, table
  write grants and CREATE). The public health endpoint does not report it:
  it would tell anyone the role can write.

## P1 — Change safely

### Rollback rehearsal

Goal: The rollback procedure is known to work.

- The maintainer runs the documented rollback once on production and back,
  and records the time in `docs/deployment.md`.

## P2 — Harden

### Backup restore rehearsal

Goal: Database loss is recoverable to a known point.

- One restore from backup into a scratch database succeeds; the recovery
  time is recorded in `docs/backup-restore.md`.

### Legacy run fields

Goal: One schema for runs.

- Readers use only the new fields; the legacy fields stop being written and
  are dropped after 2026-12-26 (#62).

## Later

- Key rotation without downtime: sealed values carry a key id, both keys
  read, a script re-seals. Until then, `docs/secret-rotation.md`.
- Workspace isolation, before workspaces ship: the checklist in #216.
- Per-workspace quotas for checks, concurrency and alert rate.
- Contract tests for the MCP server and the public API.
- Performance baselines for connection pools and storage growth.

## Out of scope

- A staging environment. Risky changes get a manual `vercel deploy` preview.
- A key management service, on-call rotation and SLOs: they need a team.
- Chaos testing and hot configuration reload.
