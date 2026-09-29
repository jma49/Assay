# Database

Assay keeps everything it owns in one MongoDB database: the one named in the
path of `MONGODB_URI`, else `MONGODB_DB_NAME`, else `sql_script_monitoring`
(`src/lib/database/mongo-connection.ts`). The PostgreSQL database in
`DATABASE_URL` is the one being checked; Assay only reads it, through a
read-only transaction.

Indexes live in `src/lib/database/indexes.ts` and are created on start-up
(`ensureIndexes`, idempotent). Every collection below lists them.

## Conventions

- **New fields are camelCase**; older runs may still carry retired
  snake_case fields (see [Legacy fields](#legacy-fields)).
- **Who and when** come from the server, never the request: `createdBy`,
  `updatedBy`, `by` are `{ id, email }` or `{ id, name }` of the session.
- **Workspaces:** documents written since phase 4 carry `workspaceId`;
  older ones have none and belong to `default`.
- **Retention** is a TTL index on a date field; a document without it is
  kept.
- **Concurrency** is handled in the database, not in memory: conditional
  updates (`findOneAndUpdate` with the expected state), unique indexes for
  idempotency, and version counters. See [Concurrency](#concurrency).

## Checks and runs

### `checks`

| Field | |
| --- | --- |
| `scriptId` | The check's id, unique, used in URLs |
| `name`, `cnName`, `description`, `cnDescription`, `scope`, `cnScope`, `hashtags` | What people see |
| `sqlContent` | The read-only query |
| `isScheduled`, `cronSchedule` | Schedule (cron, UTC) |
| `author` | Display label only; never trusted |
| `createdBy`, `updatedBy` | From the session |
| `version` | Incremented by every edit; saves apply only onto the version they started from |
| `state` | `{ outcome, rowCount, previousRowCount, since, lastRunId, lastRunAt }`, written by `runCheck` |
| `lease` | `{ runId, until }` while a run holds the check |
| `pendingEvents` | Events committed with `state` but not yet written to `events`; normally empty (see [Concurrency](#concurrency)) |
| `alerting` | `{ owner, mutedUntil, mutedBy, ack: { since, by, at } }` |
| `demoSeed` | `true` on the seeded demo checks only; lets demo viewers run them |
| `currentVersionId`, `currentVersion`, `currentVersionOrder` | The current `script_versions` record; `currentVersionOrder` sorts like the version, so a slower save never moves it back |
| `approvalStatus`, `approvalRequestId`, `createdAt`, `updatedAt` | |

Indexes: `scriptId` unique; `createdAt`.

### `runs`

| Field | |
| --- | --- |
| `checkId`, `trigger`, `startedAt`, `finishedAt`, `durationMs` | |
| `outcome` | `clean` / `issues` / `error` |
| `rowCount`, `columns` | |
| `sample` | Sample rows: at most 500 and 2 MB (`raw_results` on runs saved before 2026-09-28) |
| `rowKeys` | Fingerprints of up to 5,000 rows, for new / still / fixed |
| `diff` | `{ added, still, fixed }` against the previous run |
| `error`, `message`, `findings` | |
| `expiresAt` | `finishedAt + RUN_RETENTION_DAYS` (90 by default) |

Indexes: `finishedAt`; `(checkId, finishedAt)`; `(outcome, finishedAt)`;
TTL on `expiresAt`. Only `run-check-store.ts` writes runs.

### `events` — what changed

One per run that changed something: `{ type, checkId, runId, from, to,
rowCount, diff, error, at, workspaceId, fannedOutAt, suppressed, actionKey }`.
The activity feed and the notification outbox read it.

Indexes: `runId` unique (a retried run never notifies twice); `(checkId, at)`;
TTL on `at`: kept 180 days.

### `batches`

Progress of "run all" requests. TTL: 7 days after `startedAt`.

### `check_actions`

Audit of acknowledge / mute / assign: `{ checkId, action, detail, by,
source (web | slack | telegram | mcp), at }`. Index `(checkId, at)`; TTL on
`at`: kept 180 days. The current acknowledge / mute / owner live on the check.

Kept without expiry, as the audit trail: `edit_history`, `approval_requests`,
`script_versions`.

## Alerts

| Collection | Holds | Indexes |
| --- | --- | --- |
| `notification_destinations` | A channel: `kind`, `label`, `sealed` (AES-256-GCM secret), `alerts`, `tags`, `language`, `digest`, `remind`, `enabled`, `lastDelivery`, `lastDigestAt`, `source` | `(workspaceId, createdAt)` |
| `notification_deliveries` | One per event and destination: `status`, `attempts`, `nextAttemptAt`, `claim`, `sentAt`, `lastError` | `(eventId, destinationId)` unique; `(status, nextAttemptAt)`; `(destinationId, sentAt)`; TTL 30 days on `createdAt` |
| `notification_reminders` | Reminders sent per problem and destination: `sent`, `lastAt` | `(destinationId, checkId, since)` unique; TTL 30 days on `lastAt` |
| `telegram_links` | Pending chat links: `codeHash` (never the code) | `codeHash` unique; TTL on `expiresAt` |
| `integration_state` | The Telegram polling offset | |

## Review and history

| Collection | Holds |
| --- | --- |
| `approval_requests` | A change waiting for review: `requestId`, `scriptId`, `requesterId`, `operationType`, `originalData` (only editable fields are applied), `status` (moves from `pending` once), `reviewedBy`, `applyError`. Indexes: `requestId` unique; `(status, requestedAt)` |
| `edit_history` | Every create / update / delete with a snapshot and field changes. Indexes: `operationTime`; `(scriptSnapshot.scriptId, operationTime)` |
| `script_versions` | Full copies per version (`version` here is a semantic string like `1.2.0`, unrelated to a check's `version`). Indexes: `(scriptId, createdAt)`; `(scriptId, version)` unique |

## People and access

| Collection | Holds | Indexes |
| --- | --- | --- |
| `user`, `session`, `account`, `verification`, `apikey` | Better Auth: users, sessions, Google/GitHub accounts, one-time tokens, hashed API keys | `user.email` unique; `session.token` unique, `session.userId`, TTL `session.expiresAt`; `account.userId`, `(providerId, accountId)` unique; `verification.identifier`, TTL `expiresAt`; `apikey.key` unique, `apikey.referenceId` |
| `user_roles` | `{ userId, email, role, isActive, legacyUserId }`; `legacyUserId` is the Clerk id of a role moved to its new user | `userId` unique |

## Concurrency

| Race | Handled by |
| --- | --- |
| Two runs of one check | `lease` taken with `findOneAndUpdate`; state written only while this run holds it (fencing by `runId`) |
| A run finishing while another started | `commitState` filters on `lease.runId` |
| A process dying between saving a check's state and writing its event | The event is pushed to the check's `pendingEvents` in the same update as `state`; then written to `events` and pulled. The next run of the check and every dispatch (`repairPendingEvents`) write whatever is left, so an alert is late at worst, never lost |
| A batch outliving its function (`maxDuration`, 300 s) | Checks start only while a whole run (`CHECK_TIMEOUT_MS` + 15 s) fits before the deadline; the rest are marked `skipped`. Alerts go out in the last 30 s even if a run is still going |
| Two dispatchers sending one alert | `notification_deliveries` unique per event and destination; each delivery claimed with a conditional update |
| Two digests / reminders | `claimDigest` and `claimReminder` compare-and-set |
| Two people editing a check | `version`, applied with `findOneAndUpdate`, whose returned document is the edit history's "before" |
| Two saves recording a version at once | The unique `(scriptId, version)` index lets one take a number; the other retries with the next. The current flag moves only after the insert and only downwards (each save demotes lower versions, and itself if a higher one exists) |
| Approve racing reject | `status: "pending"` in the update filter |
| Acknowledging a problem that just changed | `state.since` in the update filter |
| A Telegram code used twice | claimed with `findOneAndUpdate` on `destinationId: null` |

Why not a transaction: the state and its event are one single-document
update, which MongoDB applies atomically without a replica-set session,
and `events` keeps its plain unique index on `runId`, so writing the event
twice (a run and a dispatcher repairing it at once) stays harmless.

Tests against a real MongoDB (`*.integration.test.ts`) run only when
`MONGODB_TEST_URI` points at a throwaway server, e.g.
`mongodb-memory-server`; each uses its own `assay_it_*` database and drops
it. Never point it at the database in `.env.local`.

## Legacy fields

Runs saved before 2026-09-27 also carry the fields the first version's
pages read. New runs no longer write them and nothing reads them: the
APIs and pages use the run's own fields throughout.

| Retired | Read instead |
| --- | --- |
| `script_name` | `checkId` |
| `execution_time` | `finishedAt` |
| `statusType` (`success` / `attention_needed` / `failure`), `status` | `outcome` |
| `raw_results` (until 2026-09-28) | `sample` |

Runs saved before 2026-09-28 keep their sample as `raw_results`; readers go
through `storedSample()` (`src/server/runs/sample.ts`), which falls back to
it. The fallback can go once those runs have expired (the last one expires
on 2026-12-26 with the default retention). `message`, `findings` and
`github_run_id` keep their names.

Runs saved before the run pipeline only had the legacy fields;
`scripts/migrations/backfill-run-fields.ts` derived the new ones (dry run,
then `--apply`; idempotent; applied to production).

The retired fields disappear with their runs through the retention TTL
(`RUN_RETENTION_DAYS`, 90 days by default), so no data migration is needed.
The old indexes `execution_time_-1` and `script_name_1_execution_time_-1`
have been dropped in production (issue #62).

## Renamed collections

Checks were stored in `sql_scripts` and runs in `result` until 2026-09.
Every process renames them before it uses the database: `getDb()` awaits
`migrateCollectionNames` (`src/lib/database/migrate-collection-names.ts`)
once, before the background index build, so indexes are never created on an
empty new collection next to the old one. `renameCollection` is atomic and
keeps the documents and indexes, and instances starting together may race
harmlessly. Nothing needs to be run by hand for an ordinary upgrade.

| Old name | New name | On start |
| --- | --- | --- |
| `sql_scripts` | `checks` | renamed if only the old name exists |
| `result` | `runs` | renamed if only the old name exists |

If both names exist, the app uses the new one and never merges on its own:
that happens when a build from before the rename ran after it (a rollback)
and wrote to the old name. An empty old collection is renamed aside to
`<old>_orphaned_<time>` and a warning logged, never dropped: an old build
still serving could write to it between the count and a drop. Drop the
orphan once nothing writes the old name. If the old collection holds
documents, it logs a warning with both counts. Merge with the script:

```bash
npm run migrate:collections                              # show both names and counts
npm run migrate:collections -- --merge                   # count old-only documents
npm run migrate:collections -- --merge --apply           # copy them (documents already in the new collection win)
npm run migrate:collections -- --merge --apply --drop-old  # then drop the old collection once every document arrived
```

`--apply` alone renames where only the old name exists, the same as the app.
The merge looks up old ids in the new collection 500 at a time.

**Rolling back** to a build from before the rename: that build reads and
writes `sql_scripts` and `result`. After the rename they no longer exist, so
it shows no checks or runs, and its first write creates a new, nearly empty
old-named collection. Before rolling back, rename them back by hand
(`db.checks.renameCollection("sql_scripts")`,
`db.runs.renameCollection("result")`); after rolling forward again the app
renames them once more.

### Future renames: a release step, not first request

The 2026-09 rename ran on the first request after the deploy, and that
is fragile, so do the next one differently:

- **The cron runs `main` before Vercel serves it.** The scheduled workflow
  checks out `main` and runs checks from GitHub Actions within minutes of a
  push, while the Vercel build for the same commit may still be running and
  the old build still answers requests. For that window the new code (cron)
  and the old code (web) use different collection names, each creating
  what it misses.
- **So rename explicitly, as a step of the release:** first ship a build
  that reads both names (new first) and writes the new one; run the rename
  with the migration script once that build is live everywhere; only then
  ship the build that knows the new name alone. Pause the cron workflow
  (or let it skip) for the release if the old and new builds cannot
  share the data.
- Checking in the cron whether the deployed version matches its commit
  was considered and left out: it needs a Vercel API token in the
  workflow and still races the alias switch.
