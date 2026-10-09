# Database

Assay keeps its own data in one MongoDB database: the one named in the path
of `MONGODB_URI`, else `MONGODB_DB_NAME`, else `sql_script_monitoring`
(`src/lib/database/mongo-connection.ts`). Collection names are in
`src/lib/database/collections.ts`. The PostgreSQL databases being checked
are data sources (`DATABASE_URL` and [`data_sources`](#data_sources)),
only ever read inside a read-only transaction.

Indexes are defined in `src/lib/database/indexes.ts` and created on start
(`ensureIndexes`, idempotent). An index that is replaced (MongoDB cannot
change a TTL index's key in place) goes in `OBSOLETE_INDEXES` by name;
`ensureIndexes` drops it before creating the new ones.

## Conventions

- **Fields are camelCase**; older runs may carry retired snake_case fields
  ([Legacy fields](#legacy-fields)).
- **Who and when** come from the session, never the request: `createdBy`,
  `updatedBy`, `by` are `{ id, email }` or `{ id, name }`.
- **Workspaces:** newer documents carry `workspaceId`; without it they
  belong to `default`.
- **Retention** is a TTL index on a date field; a document without that
  field is kept.
- **Concurrency** is handled in the database: conditional updates, unique
  indexes and version counters ([Concurrency](#concurrency)).

## Checks and runs

### `checks`

| Field | |
| --- | --- |
| `scriptId` | The check's id, unique, used in URLs |
| `name`, `cnName`, `description`, `cnDescription`, `scope`, `cnScope`, `hashtags` | What people see |
| `sqlContent` | The read-only query |
| `dataSourceId` | The [data source](#data_sources); missing means `default` (`DATABASE_URL`) |
| `isScheduled`, `cronSchedule` | Schedule (cron, UTC) |
| `author` | Display label only; never trusted |
| `createdBy`, `updatedBy` | From the session |
| `version` | Incremented by every edit; a save applies only onto the version it started from |
| `state` | `{ outcome, rowCount, previousRowCount, since, lastRunId, lastRunAt }`, written by `runCheck` |
| `lease` | `{ runId, until }` while a run holds the check |
| `pendingEvents` | Events committed with `state` but not yet in `events`; normally empty |
| `alerting` | `{ owner, mutedUntil, mutedBy, ack: { since, by, at } }` |
| `demoSeed` | `true` on the seeded demo checks only; lets demo viewers run them |
| `currentVersionId`, `currentVersion`, `currentVersionOrder` | The current `script_versions` record; `currentVersionOrder` sorts like the version, so a slower save never moves it back |
| `approvalStatus`, `approvalRequestId`, `createdAt`, `updatedAt` | |

Indexes: `scriptId` unique; `createdAt`.

Runs, events and versions are not deleted with their check. A check created
again under the same `scriptId` rebuilds its state only from runs since its
own `createdAt`, but its history and activity still show the old runs until
they expire, and its versions continue the old numbering.

### `runs`

| Field | |
| --- | --- |
| `checkId`, `trigger` (`{ kind: schedule \| manual \| batch \| api, by }`), `startedAt`, `finishedAt`, `durationMs` | |
| `outcome` | `clean` / `issues` / `error` |
| `rowCount`, `columns` | |
| `sample` | At most 500 rows and 1 MB of UTF-8 JSON |
| `rowKeys` | Fingerprints of up to 5,000 rows, for new / still / fixed |
| `diff` | `{ added, still, fixed }` against the previous run |
| `error`, `message`, `findings` | |
| `expiresAt` | `finishedAt + RUN_RETENTION_DAYS` (90 by default) |

Indexes: `finishedAt`; `(checkId, finishedAt)`; `(outcome, finishedAt)`;
TTL on `expiresAt`. Only `run-check-store.ts` writes runs.

### Other run collections

- **`events`**, one per run that changed something: `{ type, checkId,
  runId, from, to, rowCount, diff, error, at, workspaceId, fannedOutAt,
  suppressed, actionKey }`. The activity feed and the notification outbox
  read it. Indexes: `runId` unique (a retried run never notifies twice);
  `(checkId, at)`; TTL 180 days on `at`.
- **`batches`**, progress of "run all" requests: `{ executionId,
  requestedBy, scripts: [{ scriptId, status, … }], totalScripts, startedAt,
  completedAt, isActive }`. TTL 7 days after `startedAt`.
- **`check_actions`**, the audit of acknowledge / mute / assign: `{ checkId,
  action, detail, by, source (web | slack | telegram | mcp), at }`. Index
  `(checkId, at)`; TTL 180 days. The current values live on the check.
- **`cron_heartbeats`**, the scheduler heartbeat written by scheduled runs.

## Data sources

### `data_sources`

Databases added under Settings → Data sources; the built-in `default` from
`DATABASE_URL` has no document. Security rules:
[architecture.md](architecture.md#data-sources).

| Field | |
| --- | --- |
| `sourceId` | The id checks name in `dataSourceId`; `default` and `test` are reserved |
| `name`, `engine` | `engine` is `postgres` |
| `connection` | The connection string, sealed with `ASSAY_SECRET_KEY` (AES-256-GCM); never returned or logged |
| `display` | `user@host:port/database`, shown instead of the connection string |
| `version` | Incremented by every edit (409 on a stale one); keys pools and schema caches |
| `lastTest` | `{ ok, at, error, serverVersion, currentUser, readOnly, writeAccess }` or null; cleared when the connection changes |
| `createdBy`, `createdAt`, `updatedBy`, `updatedAt`, `workspaceId` | |

Index: `(workspaceId, sourceId)` unique. A source in use cannot be deleted.

## Alerts

| Collection | Holds | Indexes |
| --- | --- | --- |
| `notification_destinations` | A channel: `kind`, `label`, `sealed` (AES-256-GCM secret), `alerts`, `tags`, `language`, `digest`, `remind`, `enabled`, `lastDelivery`, `lastDigestAt`, `source` | `(workspaceId, createdAt)` |
| `notification_deliveries` | One per event and destination: `status`, `attempts`, `nextAttemptAt`, `claim`, `sentAt`, `lastError`, `createdAt`, `updatedAt` (stamped by every write) | `(eventId, destinationId)` unique; `(status, nextAttemptAt)`; `(destinationId, sentAt)`; TTL 30 days on `updatedAt` |
| `notification_reminders` | Reminders sent per problem and destination: `sent`, `lastAt` | `(destinationId, checkId, since)` unique; TTL 30 days on `lastAt` |
| `telegram_links` | Pending chat links: `codeHash` (never the code) | `codeHash` unique; TTL on `expiresAt` |
| `integration_state` | The Telegram polling offset | |

A delivery expires 30 days after it last changed, so one still retrying is
never deleted and a dead letter stays listed for 30 days after it failed.
The TTL used to be on `createdAt` (issue #213); `createdAt_1` is in
`OBSOLETE_INDEXES`. Old deliveries that never changed have no `updatedAt`
and never expire until this idempotent migration copies `createdAt` into it:

```bash
DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/migrations/set-delivery-updated-at.ts          # dry run
DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/migrations/set-delivery-updated-at.ts --apply
```

## Review and history

Kept without expiry, as the audit trail:

| Collection | Holds |
| --- | --- |
| `approval_requests` | A change waiting for review: `requestId`, `scriptId`, `requesterId`, `operationType`, `originalData` (only editable fields are applied), `status` (leaves `pending` once), `reviewedBy`, `applyError`. Indexes: `requestId` unique; `(status, requestedAt)` |
| `edit_history` | Every create / update / delete with a snapshot and field changes. Indexes: `operationTime`; `(scriptSnapshot.scriptId, operationTime)` |
| `script_versions` | Full copies per version (`version` is a semantic string like `1.2.0`, unrelated to a check's `version`). Indexes: `(scriptId, createdAt)`; `(scriptId, version)` unique |

## People and access

| Collection | Holds | Indexes |
| --- | --- | --- |
| `user`, `session`, `account`, `verification`, `apikey` | Better Auth: users, sessions, Google/GitHub accounts, one-time tokens, hashed API keys | `user.email` unique; `session.token` unique, `session.userId`, TTL `session.expiresAt`; `account.userId`, `(providerId, accountId)` unique; `verification.identifier`, TTL `expiresAt`; `apikey.key` unique, `apikey.referenceId` |
| `user_roles` | `{ userId, email, role, isActive, legacyUserId }` (`legacyUserId`: the Clerk id of a migrated role) | `userId` unique |
| `oauthClient`, `oauthConsent`, `oauthRefreshToken`, `oauthClientResource`, `oauthResource`, `jwks` | OAuth for MCP clients ([mcp.md](mcp.md#oauth)) | Better Auth's |

## Concurrency

| Race | Handled by |
| --- | --- |
| Two runs of one check | `lease` taken with `findOneAndUpdate`; `commitState` writes only while `lease.runId` matches (fencing) |
| A process dying between a check's state and its event | The event goes into `pendingEvents` in the same update as `state`, then into `events`. The next run and every dispatch (`repairPendingEvents`) write what is left, so an alert is late at worst, never lost |
| A batch outliving its function (300 s) | Checks start only while a whole run (`CHECK_TIMEOUT_MS` + 15 s) fits; the rest are `skipped`. Alerts go out in the last 30 s |
| Two dispatchers sending one alert | Deliveries unique per event and destination, each claimed with a conditional update |
| Two digests or reminders | `claimDigest`, `claimReminder` compare-and-set |
| Two people editing a check | `version` in a `findOneAndUpdate`, whose returned document is the edit history's "before" |
| Two saves recording a version | The unique `(scriptId, version)` index lets one take a number; the other retries with the next. The current flag moves only after the insert and only downwards |
| Approve racing reject | `status: "pending"` in the update filter |
| Acknowledging a problem that just changed | `state.since` in the update filter |
| A Telegram code used twice | `findOneAndUpdate` on `destinationId: null` |

No transactions: the state and its event are one single-document update,
which MongoDB applies atomically without a replica set, and the unique
`runId` index makes writing an event twice harmless.

Integration tests (`*.integration.test.ts`) run only when `MONGODB_TEST_URI`
points at a throwaway server (e.g. `mongodb-memory-server`); each uses and
drops its own `assay_it_*` database. Never point it at `.env.local`'s
database.

## Legacy fields

Runs saved before 2026-09-27 also carry the first version's fields. Nothing
writes or reads them except one fallback, and they expire with their runs.

| Retired | Use instead |
| --- | --- |
| `script_name` | `checkId` |
| `execution_time` | `finishedAt` |
| `statusType`, `status` | `outcome` |
| `raw_results` (until 2026-09-28) | `sample` |

`storedSample()` (`src/server/runs/sample.ts`) still falls back to
`raw_results`, trimming it to 1 MB; remove the fallback once those runs
expire (2026-12-26 at the default retention). `message`, `findings` and
`github_run_id` keep their names.

## Renamed collections

Checks lived in `sql_scripts` and runs in `result` until 2026-09. Every
process renames them before using the database: `getDb()` awaits
`migrateCollectionNames` (`src/lib/database/migrate-collection-names.ts`)
once, before building indexes. `renameCollection` is atomic and keeps
documents and indexes; instances racing on start are harmless.

If both names exist (a pre-rename build ran after the rename and wrote to
the old one), the app uses the new name and never merges by itself. An
empty old collection is renamed aside to `<old>_orphaned_<time>` with a
warning, never dropped; drop it once nothing writes the old name. One with
documents is only logged with both counts; merge it with the script:

```bash
npm run migrate:collections                                # both names and counts
npm run migrate:collections -- --merge                     # count old-only documents
npm run migrate:collections -- --merge --apply             # copy them (the new collection wins)
npm run migrate:collections -- --merge --apply --drop-old  # then drop the old one once all arrived
```

`--apply` alone renames where only the old name exists, as the app does.

**Rolling back** below the rename: the old build reads `sql_scripts` and
`result`, so first rename them back by hand
(`db.checks.renameCollection("sql_scripts")`,
`db.runs.renameCollection("result")`). Rolling forward renames them again.

**Next time, rename as a release step, not on first request.** The cron
workflow runs `main` from GitHub Actions minutes after a push, while Vercel
may still serve the old build, so for a while the two use different names.
Ship a build that reads both names (new first) and writes the new one, run
the rename script once it is live everywhere, then ship the build that
knows only the new name; pause the cron for the release if the builds
cannot share data.
