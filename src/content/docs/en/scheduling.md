# Scheduling

Turn on **Run on a schedule** when editing a check and give it a cron expression. Times are in **UTC**.

| Expression | Runs |
|---|---|
| `0 * * * *` | Every hour, on the hour |
| `*/30 * * * *` | Every 30 minutes |
| `0 8 * * *` | Every day at 08:00 UTC |
| `0 8 * * 1` | Every Monday at 08:00 UTC |

## What starts scheduled runs

Assay itself does not keep a clock running. Something has to start the scheduled runner, which then runs every check whose cron expression matches the current time (within 30 minutes). A self-hosted workspace has two options:

### GitHub Actions

The repository includes `.github/workflows/sql-check-cron.yml`. Add `DATABASE_URL` and `MONGODB_URI` as repository secrets and enable its `schedule:` trigger. You can also start it by hand from the Actions tab and choose a mode (`scheduled`, `all` or `backup`).

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
