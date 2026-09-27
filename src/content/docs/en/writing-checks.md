# Writing checks

Choose **New check** at the right of the top bar.

## The editor

Write the query on the left. The toolbar above it can:

- **AI** — describe what you are looking for and let the AI draft the SQL. See [AI assistant](/docs/ai-assistant).
- **Format** — tidy the SQL.
- **Preview** — check the query before saving.

The status line under the editor tells you straight away whether the SQL is allowed: *Read-only, ready to save*, or the reason it is not.

## Details

| Field | Notes |
|---|---|
| **Name** | Shown everywhere. Required. |
| **Script ID** | Generated from the name: lowercase letters, numbers and hyphens. Used in links and in history. |
| **Description** | What the check looks for and why it matters. |
| **Scope** | The part of the data it covers, such as *orders*. |
| **Tags** | Up to eight, for grouping and filtering. |
| **Author** | Defaults to your account. |
| **Schedule** | Turn on to run it on a cron schedule; see [Scheduling](/docs/scheduling). |
| **Chinese translation** | Optional Chinese name, description and scope. |

## Writing a good check

- **Return the rows someone must fix**, with the columns they need to find them (ids, dates, amounts).
- **Keep it fast.** A check has 30 seconds (five minutes for queries that look long-running) before the database cancels it.
- **Only read.** Anything that writes, locks or changes settings is rejected; see [SQL safety rules](/docs/sql-safety).

```sql
-- Orders from the same customer with the same total within five minutes
SELECT a.id, b.id AS duplicate_id, a.customer_id, a.total
FROM orders a
JOIN orders b
  ON b.customer_id = a.customer_id
 AND b.total = a.total
 AND b.id > a.id
 AND b.created_at - a.created_at < interval '5 minutes';
```

## After saving

If you are not an admin, a new check waits for approval before it runs. Every save also records a version, so you can see what changed and roll back.

## Finding what is not checked yet

**Coverage**, in the sidebar, lists every table in the database and how many checks read it. Tables without a check come first; choose one and **New check for this table** opens the editor with a starting query. A table shown as *missing* is read by a check but no longer exists, so that check will fail until it is updated.

Coverage reads the `FROM` and `JOIN` clauses of each check. It is an overview, not a guarantee: a table used only inside a function call is not counted.

## See also

- [Running checks](/docs/running-checks)
- [Approvals](/docs/approvals)
