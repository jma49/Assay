# FAQ

## Can a check change my database?

No. Checks are validated, run in a read-only transaction and have a time limit. See [SQL safety rules](/docs/sql-safety). For a second lock, give Assay a database user that can only `SELECT`.

## Which databases can I check?

PostgreSQL. Any database that speaks the PostgreSQL protocol, such as Neon or Supabase, works too.

## What counts as a failed check?

One that could not run: a syntax error, a missing table, a timeout. A check that runs and returns rows **needs attention**; that is a finding, not a failure.

## Why can't I run or edit checks?

New accounts are viewers. Ask an admin for the developer role; see [Accounts and roles](/docs/accounts-and-roles).

## Why did my change not appear?

If you are not an admin, creating a check, editing someone else's check and deleting one wait for approval. See [Approvals](/docs/approvals).

## My scheduled check did not run.

Something has to start scheduled runs; see [Scheduling](/docs/scheduling). Remember that cron times are in UTC.

## The AI says I have made too many requests.

Each person can make 30 AI requests per hour. Wait for the next hour.

## Who can sign up?

Anyone, unless the workspace sets `ALLOWED_EMAIL_DOMAINS`. New accounts start as viewers.
