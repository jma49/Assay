# Quick start

Run your first data check on the live demo in a few minutes.

## Step 1 — Sign in

Open [the demo](https://assay.majincheng.com) and choose **Try the live demo**. You can look around as a guest without an account, or sign in with Google or GitHub. New accounts join the demo workspace as **viewers**: you can read every check and every result, but not change them.

> On the demo, viewers can run the sample checks (up to 20 runs an hour) but not edit them. To try the whole flow, [host your own copy](/docs/deployment) or ask an admin for the developer role.

## Step 2 — Look around

The sidebar on the left takes you to each section: **Checks**, **Runs**, **Coverage** and **Analysis**, plus **Approvals** and **Members** if your role allows. **Runs** shows:

- **Totals** — how many runs were **Broken**, found **Issues** or came back **Clean**.
- **Run history** — every run, newest first, with a filter per status.

## Step 3 — Run a check

1. Open **Runs** and choose **Run a check…** in the top bar.
2. Pick a check such as *Duplicate orders* and choose **Run**.
3. When it finishes, the new run appears at the top of the run history.

## Step 4 — Read the result

Open **View report** on the run. A check that returned no rows is **Clean**. A check that returned rows has **Issues**, and the rows are listed so you can see exactly what is wrong. A check whose query could not run is **Broken**, with the error.

## See also

- [Core concepts](/docs/concepts) — what a check is and what the three statuses mean.
- [Writing checks](/docs/writing-checks) — write your own.
- [Deployment](/docs/deployment) — run Assay against your own database.
