# Roadmap

This document lists the infrastructure goals for Assay. It sets no dates.
A goal is complete when all its acceptance checks pass.

## P0 — Stabilize

### Observability

Goal: The team sees errors, health, and request traces without manual log search.

- Errors go to an error tracking service with release and environment tags.
- `GET /api/health` returns 200 and reports the status of MongoDB, Redis, and the default data source.
- Logs are structured and carry a request id from the edge to the database call.

### Scheduler survival

Goal: A missed or disabled schedule becomes visible within one hour.

- A heartbeat monitor watches the scheduled workflow. If no run starts in 60 minutes, the monitor sends an alert.
- The alert path does not depend on the scheduler itself.

### Branch protection

Goal: No change reaches `main` without the required checks.

- Branch protection covers `main` (confirmed) and `develop` (verify).
- Required checks are typecheck, lint, tests, and build.
- Direct pushes to `main` and `develop` are blocked.

### Alert delivery guarantees

Goal: A failed alert has a defined end state. No alert is lost silently.

- The notification outbox has a maximum retry count.
- Exhausted alerts move to a dead-letter store with the failure reason.
- Operators can list dead-letter alerts and re-send them.

## P1 — Deploy safely

### Staging

Goal: Changes run in a production-like environment before they reach production.

- A staging deployment exists and uses the same build as production.
- Each pull request gets a preview deployment, or the staging branch tracks `develop`.

### Rollback

Goal: A bad deploy is reversed in minutes with a known procedure.

- The rollback procedure is documented.
- The team rehearses the rollback once and records the time it takes.

### Integration tests in CI

Goal: CI runs the integration tests on every pull request.

- CI sets `MONGODB_TEST_URI`, so no integration test is skipped.

### Secret key backup

Goal: Loss of `ASSAY_SECRET_KEY` is recoverable.

- The sealed backup procedure for the key is documented.
- Two maintainers can restore the key from the backup.

## P2 — Harden

### Key management

Goal: Secrets rotate without downtime and without manual database edits.

- A key management service holds `ASSAY_SECRET_KEY`.
- Key rotation is supported, and old data stays readable during rotation.

### Backup and restore

Goal: Database loss is recoverable to a known point in time.

- The MongoDB backup schedule is documented: [backup-restore.md](backup-restore.md).
- A restore rehearsal succeeds, and the recovery time is recorded.

### Default-deny authorization

Goal: A new route stays closed until it is opened explicitly.

- Routes without an explicit permission return 401 or 403.
- A test fails when a new API route lacks an authorization wrapper.

### Workspace isolation

Goal: Every data access is scoped to a workspace. Cross-workspace leaks are impossible by construction.

- All stores require a workspace id, and checks carry a workspace id.
- A lint rule or test fails when a store query lacks the workspace filter.

### Compliance

Goal: Third-party licenses and dependencies are declared and auditable.

- Each release generates an SBOM.
- `THIRD_PARTY_NOTICES.md` lists all production dependencies and their licenses.

### Operations handbook

Goal: An operator who is not the author can run the service.

- A runbook covers deploy, rollback, backup restore, and common failures.
- On-call responsibilities and SLOs are written down.

## P3 — Later

- Quota management: per-workspace limits for checks, concurrency, and alert rate.
- Hard multi-tenant isolation.
- Contract tests for the MCP server and the public API.
- Performance baselines for connection pools and storage growth.

## Out of scope

- Chaos testing. The cost is higher than the benefit at this stage.
- Hot configuration reload. The platform redeploys on configuration change, and this is accepted.
