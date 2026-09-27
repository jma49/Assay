# Scheduling

Turn on **Run on a schedule** when editing a check and give it a cron expression. Times are in **UTC**.

| Expression | Runs |
|---|---|
| `0 * * * *` | Every hour, on the hour |
| `*/30 * * * *` | Every 30 minutes |
| `0 8 * * *` | Every day at 08:00 UTC |
| `0 8 * * 1` | Every Monday at 08:00 UTC |

## What starts scheduled runs

Assay itself does not keep a clock running. Something starts the scheduled runner, which runs each check **once per slot**: the latest time its cron expression fired, if the check has not run for it yet. Late triggers still catch the slot, repeated triggers never run it twice, and slots more than two hours old are skipped rather than all run at once.

A self-hosted workspace has two options:

### GitHub Actions (recommended)

`.github/workflows/sql-check-cron.yml` starts the runner every 30 minutes. Add `DATABASE_URL` and `MONGODB_URI` as repository secrets and it begins on the default branch; without them it skips quietly. You can also start it by hand from the Actions tab, choosing `scheduled` (checks that are due) or `all` (every check now).

To see what would run without running anything:

```bash
DOTENV_CONFIG_PATH=.env.local npx ts-node -r dotenv/config scripts/run-all-scripts.ts scheduled --dry-run
```

### A small always-on server

Run the standalone scheduler, which reads the schedules from MongoDB and runs each check at its own time:

```bash
npm run scheduler
```

## Running scheduled checks by hand

**Bulk Execution → Execute Scheduled Scripts** on the dashboard runs every scheduled check now, whatever the time.

## See also

- [Running checks](/docs/running-checks)
- [Deployment](/docs/deployment)
