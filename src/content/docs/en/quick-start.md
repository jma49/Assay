# Quick start

Run your first data check on the live demo in a few minutes.

## Step 1 — Sign in

Open [the demo](https://assay-sql.vercel.app) and choose **Try the live demo**. Sign in with any email address or with Google. New accounts join the demo workspace as **viewers**: you can read every check and every result, but not change them.

> On the demo, viewers can run the sample checks (up to 20 runs an hour) but not edit them. To try the whole flow, [host your own copy](/docs/deployment) or ask an admin for the developer role.

## Step 2 — Look around the dashboard

The dashboard opens in a window on the desktop. From top to bottom:

- **Manual Trigger Check** — pick a check and run it now, or run many at once.
- **Totals** — how many runs passed, need attention or failed.
- **Check History** — every run, newest first, with a filter per status.

The Dock at the bottom of the screen takes you to the other sections: Scripts, New Check, Analysis, Approvals and Users.

## Step 3 — Run a check

1. Choose **Run a Check…** in the window toolbar.
2. Pick a check such as *Duplicate orders* and choose **Run Check**.
3. When it finishes, the new run appears at the top of **Check History**.

## Step 4 — Read the result

Open **View Full Report** on the run. A check that returned no rows **passed**. A check that returned rows **needs attention**, and the rows are listed so you can see exactly what is wrong. A check that could not run **failed**, with the error.

## See also

- [Core concepts](/docs/concepts) — what a check is and what the three statuses mean.
- [Writing checks](/docs/writing-checks) — write your own.
- [Deployment](/docs/deployment) — run Assay against your own database.
