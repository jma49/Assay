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
- **Runbooks** (#222): rollback (`docs/deployment.md`), backup and restore
  (`docs/backup-restore.md`), `ASSAY_SECRET_KEY` rotation and recovery
  (`docs/secret-rotation.md`).

## P0 — Close live gaps

### Default-deny API routes

Goal: A new API route stays closed until it is opened on purpose.

- A test lists every `src/app/api/**/route.ts` and fails unless it uses
  `withAuth` or is in an explicit allowlist with the reason it has its own
  auth or is public (sign-in, health, MCP, the dispatch cron, the Slack and
  Telegram webhooks).

### Scheduled runs can use added data sources (maintainer action)

Goal: A scheduled check against an added data source runs, not fails.

- The `ASSAY_SECRET_KEY` repository secret exists and matches Vercel. The
  scheduled workflow already passes it to the runner.

### Read-only monitored database (maintainer action)

Goal: No check, bug or leaked credential can write to the monitored database.

- No app or CI secret holds a role that can write: `DATABASE_URL` (Vercel,
  GitHub secret, `.env.local`) uses `assay_readonly` with only SELECT,
  `default_transaction_read_only = on` and a statement timeout
  ([architecture.md](architecture.md#running-a-check)).
- The `postgres` health probe reports whether its role is read-only, as a
  field, so the gap is visible without making the probe fail.

## P1 — Change safely

### Scheduler alert outside GitHub

Goal: A dead schedule reaches the maintainer within an hour.

- The scheduled workflow sends Sentry Cron check-ins (`in_progress`, then
  `ok` or `error`); Sentry alerts on a missed or failed check-in. Sentry
  does not depend on GitHub Actions, which runs the schedule.
- GitHub disables scheduled workflows after 60 days without repository
  activity; `docs/deployment.md` says how to see that and re-enable it.

### Delivery retention

Goal: Old deliveries expire by their last activity, and none leak.

- `updatedAt` is set on create, claim and every state change; the TTL index
  keys on it, and the old index is replaced safely (#213).

### Integration tests in CI

Goal: The MongoDB integration suites run on every pull request.

- CI starts a MongoDB service and sets `MONGODB_TEST_URI`; no integration
  test is skipped (#219).

### Fail closed on missing configuration

Goal: A deploy with missing critical configuration fails loudly, not halfway.

- In production the server refuses to start without `BETTER_AUTH_SECRET`,
  `MONGODB_URI`, `DATABASE_URL` and `APP_URL` (checked at server start, not
  during `next build`); optional features stay off with one warning each.

### Rollback rehearsal

Goal: The rollback procedure is known to work.

- The maintainer runs the documented rollback once on production and back,
  and records the time in `docs/deployment.md`.

## P2 — Harden

### Backup restore rehearsal

Goal: Database loss is recoverable to a known point.

- One restore from backup into a scratch database succeeds; the recovery
  time is recorded in `docs/backup-restore.md`.

### Dependency inventory

Goal: Production dependencies are auditable.

- CI attaches an SBOM (`npm sbom`) to each run on `main` (#220).

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
