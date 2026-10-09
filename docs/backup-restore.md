# Backup and restore

All of Assay's data is in MongoDB; back up the whole database, not single
collections (every collection is listed in
`src/lib/database/collections.ts` and [database.md](database.md)). Upstash
Redis holds only transient counters and caches and is not backed up.
PostgreSQL belongs to the checked systems, not to Assay.

Backups do **not** contain `ASSAY_SECRET_KEY`; without it the sealed fields
(`data_sources.connection`, `notification_destinations.sealed`) are
unreadable. Back the key up separately ([secret-rotation.md](secret-rotation.md#backup)).

## Schedule

- One full snapshot a day; keep 7 daily and 4 weekly.
- Atlas: a scheduled cloud snapshot. Self-hosted: `mongodump` from cron,
  with archives stored off the database host.
- Targets: RPO 24 hours (the daily snapshot), RTO 2 hours from starting the
  restore to verified, with the snapshot and the key at hand.

## Restore

1. Stop writes: pause the app (scale the deployment to zero or put up a
   maintenance page).
2. Restore the snapshot: Atlas "Restore snapshot" into the same project, or
   `mongorestore --uri <uri> --archive=<archive>`.
3. Restart the app. It creates indexes and renames legacy collections on
   start (`src/lib/database/mongodb.ts`).
4. If the snapshot predates migrations the current build expects, check the
   headers of `scripts/migrations/` for backfills.

## Verify

- `db.checks.countDocuments()` and `db.runs.countDocuments()` match the
  snapshot, and a known check has its history.
- Signing in reaches `/checks` (the `user` and `session` collections
  arrived).
- `GET /api/health` returns 200.
- A check run by hand appears in its history.
- Pending notification deliveries go out on the next dispatch.

Record the time of each restore rehearsal here.
