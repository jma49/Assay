# Running checks

You need the developer role or higher to run checks.

## Run one check

1. Open the dashboard.
2. In **Manual Trigger Check**, keep **Execute Selected Script** and pick the check. You can search by name or by `#tag`.
3. Choose **Run Check**.

The result appears in **Check History** when the run finishes.

## Run many at once

Choose **Bulk Execution**, then either **Execute All Scripts** or **Execute Scheduled Scripts** (only checks with a schedule turned on). A progress panel shows each check as it runs.

The menu bar has shortcuts for both: **File → Run a Check…** and **File → Run in Bulk…** open the dashboard in the right mode from any page.

## Limits

Each check runs inside a read-only transaction and is cancelled after 30 seconds, or five minutes for queries that look long-running. A cancelled check is marked **failed**.

## See also

- [Run history and results](/docs/run-history)
- [Scheduling](/docs/scheduling)
