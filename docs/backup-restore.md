# Backup and Restore

The reference deployment stores all Assay data in MongoDB (MongoDB Atlas).
This runbook covers MongoDB backups only. Upstash Redis holds transient
counters only (rate limits, quotas); it rebuilds itself and is not backed
up. PostgreSQL belongs to the checked systems, not to Assay.

## What is backed up

Back up the whole database, not individual collections. The backup covers:

- Checks: `checks`, `script_versions`, `edit_history`, `check_actions`,
  `approval_requests`.
- Runs: `runs`, `batches`, `events`.
- Notification state: `notification_destinations`,
  `notification_deliveries` (the outbox, including the failed-dead-letter
  entries), `notification_reminders`.
- Data sources: `data_sources` (connection strings are sealed).
- Sign-in and sessions (Better Auth): `user`, `session`, `account`,
  `verification`, `apikey`, `oauthClient`, `oauthConsent`,
  `oauthRefreshToken`, `oauthClientResource`, `oauthResource`, `jwks`.
- Scheduler and integrations: `cron_heartbeats`, `integration_state`,
  `telegram_links`, `user_roles`.

The collection list above comes from `src/lib/database/collections.ts`.
Re-check it before a restore: new collections may have been added since this
doc was written.

The backup does **not** include `ASSAY_SECRET_KEY` itself. Sealed fields
(`data_sources.connection`, `notification_destinations.sealed`) are
unreadable without it. Back the key up separately, as described in
[secret-rotation.md](secret-rotation.md).

## Frequency and retention

- Take one full snapshot every day.
- Keep 7 daily snapshots and 4 weekly snapshots.
- On MongoDB Atlas, use a scheduled cloud snapshot. On a self-hosted setup,
  run `mongodump` from a cron job and store the archives off the database
  host.

## Restore procedure

1. Stop writes: pause the app (scale the Vercel deployment to zero, or put
   up a maintenance page). This keeps the restored data consistent.
2. Restore the snapshot:
   - Atlas: use the "Restore snapshot" action into the same project.
   - Self-hosted: `mongorestore --uri <uri> --archive=<archive>` against the
     target database.
3. The app creates indexes and renames legacy collections on start
   (`src/lib/database/mongodb.ts`); you do not need to recreate indexes by
   hand.
4. Restart the app.
5. Verify the restore (see below).

If you restore into a database that the new app version never saw, check
the script headers in `scripts/migrations/` for backfill steps that older
data may need.

## Verify a restore

- Collection counts match the snapshot: `db.checks.countDocuments()` and
  `db.runs.countDocuments()` return the expected numbers.
- A known check is present with its history.
- Sign-in works: `/checks` is reachable after signing in (proves the
  `user` and `session` collections arrived).
- `GET /api/health` returns 200.
- Run one check by hand from its page; the run appears in its history.
- Pending notification deliveries replay on the next dispatch.

## RTO and RPO targets

- RPO (recovery point objective): at most 24 hours. The daily snapshot sets
  this: at most one day of data can be lost.
- RTO (recovery time objective): at most 2 hours from "restore starts" to
  "verified working", assuming the snapshot and `ASSAY_SECRET_KEY` are at
  hand.
- Record the actual time of every restore rehearsal in the roadmap item
  "Backup and restore" (`docs/roadmap.md`).
