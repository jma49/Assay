# Database

Assay keeps everything it owns in one MongoDB database: the one named in the
path of `MONGODB_URI`, else `MONGODB_DB_NAME`, else `sql_script_monitoring`
(`src/lib/database/mongo-connection.ts`). The PostgreSQL database in
`DATABASE_URL` is the one being checked; Assay only reads it, through a
read-only transaction.

Indexes live in `src/lib/database/indexes.ts` and are created on start-up
(`ensureIndexes`, idempotent). Every collection below lists them.

## Conventions

- **New fields are camelCase**; runs still carry older snake_case fields,
  written but no longer read (see [Legacy fields](#legacy-fields)).
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

### `sql_scripts` — checks

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
| `alerting` | `{ owner, mutedUntil, mutedBy, ack: { since, by, at } }` |
| `demoSeed` | `true` on the seeded demo checks only; lets demo viewers run them |
| `approvalStatus`, `approvalRequestId`, `createdAt`, `updatedAt` | |

Indexes: `scriptId` unique; `createdAt`.

### `result` — runs

| Field | |
| --- | --- |
| `checkId`, `trigger`, `startedAt`, `finishedAt`, `durationMs` | |
| `outcome` | `clean` / `issues` / `error` |
| `rowCount`, `columns` | |
| `raw_results` | Sample rows: at most 500 and 2 MB |
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

Indexes: `runId` unique (a retried run never notifies twice); `at`;
`(checkId, at)`.

### `batches`

Progress of "run all" requests. TTL: 7 days after `startedAt`.

### `check_actions`

Audit of acknowledge / mute / assign: `{ checkId, action, detail, by,
source (web | slack | telegram | mcp), at }`. Index `(checkId, at)`.

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
| `approval_history` | Every approve / reject |
| `edit_history` | Every create / update / delete with a snapshot and field changes. Indexes: `operationTime`; `(scriptSnapshot.scriptId, operationTime)` |
| `script_versions` | Full copies per version (`version` here is a semantic string like `1.2.0`, unrelated to `sql_scripts.version`). Index `(scriptId, createdAt)` |

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
| Two dispatchers sending one alert | `notification_deliveries` unique per event and destination; each delivery claimed with a conditional update |
| Two digests / reminders | `claimDigest` and `claimReminder` compare-and-set |
| Two people editing a check | `version` |
| Approve racing reject | `status: "pending"` in the update filter |
| Acknowledging a problem that just changed | `state.since` in the update filter |
| A Telegram code used twice | claimed with `findOneAndUpdate` on `destinationId: null` |

## Legacy fields

Runs still carry older fields, written next to the new ones by
`legacyRunFields`. Nothing reads them any more: the history, analysis and
report APIs read the new fields and map them to the old response shape in
`src/server/runs/legacy-view.ts`.

| Legacy | New |
| --- | --- |
| `script_name` | `checkId` |
| `execution_time` | `finishedAt` |
| `statusType` (`success` / `attention_needed` / `failure`), `status` | `outcome` |
| `raw_results` | (the sample; kept under this name) |
| `github_run_id` | `trigger` |

Runs saved before the run pipeline only have the legacy fields;
`scripts/migrations/backfill-run-fields.ts` derives the new ones (dry run,
then `--apply`; idempotent).

Plan (issue #62): readers moved and old runs back-filled (done); stop
writing the legacy fields; drop them and the `execution_time` /
`(script_name, execution_time)` indexes, which `ensureIndexes` no longer
creates. Renaming the collections (`sql_scripts` → `checks`,
`result` → `runs`) comes last, behind a migration script, because every
deployment's data lives under the old names.
