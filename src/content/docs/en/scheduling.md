# Scheduling

Turn on **Run on a schedule** when editing a check. It defaults to every day at 09:00 UTC; choose another time under **Repeat**, or **Custom (cron)…** to type a five-field cron expression. Times are in **UTC**, and the form shows the next run in your own time zone.

| Preset | Cron |
|---|---|
| Every 30 minutes | `*/30 * * * *` |
| Every hour | `0 * * * *` |
| Every day at 00:00 / 09:00 UTC | `0 0 * * *` / `0 9 * * *` |
| Weekdays at 09:00 UTC | `0 9 * * 1-5` |
| Mondays at 09:00 UTC | `0 9 * * 1` |
| The 1st of each month at 09:00 UTC | `0 9 1 * *` |

An invalid expression cannot be saved. With the GitHub Actions runner below, a check runs at most every 30 minutes, whatever its expression.

## What starts scheduled runs

Assay itself does not keep a clock running. Something starts the scheduled runner, which runs each check **once per slot**: the latest time its cron expression fired, if the check has not run for it yet. Late triggers still catch the slot, repeated triggers never run it twice, and slots more than two hours old are skipped rather than all run at once.

A self-hosted workspace has two options:

### GitHub Actions (recommended)

`.github/workflows/sql-check-cron.yml` starts the runner every 30 minutes. Add `DATABASE_URL` and `MONGODB_URI` as repository secrets and it begins on the default branch; without them it skips quietly. You can also start it by hand from the Actions tab, choosing `scheduled` (checks that are due) or `all` (every check now), or entering a **check_id** to run just that check. Alerts go out after a run started by hand too.

The runner reads the same settings as the app, so give GitHub the ones you set on your host; any you leave out take their defaults:

| Name | Set as | Needed when |
|---|---|---|
| `DATABASE_URL`, `MONGODB_URI` | Secret | Always |
| `APP_URL`, `CRON_SECRET` | Secret | To send alerts right after a scheduled run |
| `CA_CERT_BLOB_URL`, `CLIENT_CERT_BLOB_URL`, `CLIENT_KEY_BLOB_URL` | Secret | PostgreSQL uses a private CA or client certificates |
| `MONGODB_DB_NAME` | Variable | `MONGODB_URI` names no database and you use another name than the default |
| `CHECK_TIMEOUT_MS`, `RUN_RETENTION_DAYS` | Variable | You changed them on your host |
| `CHECK_CONCURRENCY`, `PG_POOL_MAX` | Variable | Optional; checks run at once and PostgreSQL connections |

Secrets go under **Settings → Secrets and variables → Actions → Secrets**, the others under **Variables**. The workflow's log is public in a public repository, so it shows only each check's id, outcome and row count; errors stay in the app.

To see what would run without running anything:

```bash
DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/run-all-scripts.ts scheduled --dry-run
```

### Your own server

Call the same command from cron every five minutes. Each scheduled check runs once per cron slot, however often the command is called:

```cron
*/5 * * * * cd /srv/assay && npm run sql:run-scheduled >> /var/log/assay-checks.log 2>&1
```

## Running scheduled checks by hand

On the **Runs** page, choose **Run in bulk…** and pick the scheduled checks only: every scheduled check runs now, whatever the time.

## See also

- [Running checks](/docs/running-checks)
- [Deployment](/docs/deployment)
