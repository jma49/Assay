# Roadmap

Open infrastructure and reliability goals, without dates. A goal is done
when its acceptance checks pass; then delete it here (the PR records it).

Assay has one maintainer and one production deployment, so a goal that
needs a second person or a paid service is out of scope until one exists.

## P0: close live gaps

### Lower the scheduler alert limits

A dead schedule reaches the maintainer within an hour.

- Once the QStash trigger has run on time for a few days,
  `HEARTBEAT_STALE_MS` drops from 12 hours to about one.
- The alert of the Sentry monitor `scheduled-checks-trigger` (15-minute
  margin) is turned on in Sentry.

### Read-only monitored database (maintainer action)

No check, bug or leaked credential can write to the monitored database.

- Every `DATABASE_URL` (Vercel, GitHub secret, `.env.local`) uses
  `assay_readonly`: SELECT only, `default_transaction_read_only = on`, a
  statement timeout ([architecture.md](architecture.md#read-only-in-layers)).
- Settings → Data sources → Test on the default source reports it
  read-only. The public health endpoint must not report this.

## P1: change safely

### Rollback rehearsal

Run the [rollback](deployment.md#rollback) once on production and back, and
record the time in `docs/deployment.md`.

## P2: harden

### Backup restore rehearsal

Restore a backup into a scratch database once and record the recovery time
in [backup-restore.md](backup-restore.md).

### Drop the legacy sample fallback

After 2026-12-26, when the last runs with `raw_results` have expired,
remove the fallback in `storedSample()`
([database.md](database.md#legacy-fields), #62).

## Later

- Key rotation without downtime: sealed values carry a key id, both keys
  read, a script re-seals ([secret-rotation.md](secret-rotation.md)).
- Workspace isolation before workspaces ship: the checklist in #216.
- Per-workspace quotas for checks, concurrency and alert rate.
- Contract tests for the MCP server and the public API.
- Performance baselines for connection pools and storage growth.

## Out of scope

- A staging environment; risky changes get a manual `vercel deploy`
  preview.
- A key management service, on-call rotation and SLOs: they need a team.
- Chaos testing and hot configuration reload.
