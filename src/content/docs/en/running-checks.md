# Running checks

You need the developer role or higher to run checks. In the public demo, viewers and guests may run the sample checks too (see [Limits](#limits)).

## Run one check

From the check itself: open it under **Checks** and choose **Run now**. The latest result and run history on that page update when the run finishes.

From the **Runs** page:

1. Choose **Run a check…** in the top bar. The **Run a check** sheet opens.
2. Pick the check. You can search by name or by `#tag`.
3. Choose **Run check**.

The run appears at the top of the **Runs** list when it finishes. If the check is already running, Assay does not start it twice; the running result appears in the history.

## Run many at once

Choose **Run in bulk…** in the top bar of the **Runs** page, then either run every check in the list or only the scheduled ones (checks with a schedule turned on), and confirm. A progress panel shows each check as it runs.

## Limits

- Each check runs inside a read-only transaction. The whole script, every statement together, has `CHECK_TIMEOUT_MS` to finish: 30 seconds unless the server sets another value (see [Environment variables](/docs/environment-variables)). A check that runs out of time is stopped and marked **failed**.
- A server runs a few checks at a time (`CHECK_CONCURRENCY`, 4 by default); more wait for a free slot.
- In the demo, each person may start 20 runs an hour, and all guests together 200 an hour.

## See also

- [Run history and results](/docs/run-history)
- [Scheduling](/docs/scheduling)
