# Writing checks

Choose **New check** at the right of the top bar.

## Start from a template

**Start from a template**, above the editor, writes the query for the checks most tables need. Choose a template and a table, then the columns and settings it asks for; the query, name, script ID and descriptions (in both languages) are filled in, and you can still change all of them. **Undo** in the notice puts your previous draft back.

| Template | Finds |
|---|---|
| **Missing values** | Rows where a column is empty (NULL). |
| **Duplicates** | Values of one or more key columns that appear in more than one row. Rows with an empty key are not counted, as with a unique constraint. |
| **Orphaned references** | Rows whose column points to a value that another table does not have, such as orders of a customer that does not exist. |
| **Freshness** | One row when the newest timestamp is older than the hours you set, or the table is empty. |
| **Out of range** | Numbers below a minimum or above a maximum; either bound can be left out. |
| **Unexpected values** | Values outside a list you allow, one per line, compared as text. Choose whether an empty value is fine. |

The picker lists only the tables and columns the database reports, and offers only columns that suit the template (timestamps for freshness, numbers for ranges). In **Coverage**, **New check for this table** opens this page with the table already chosen.

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
- **Keep it fast.** The whole script has 30 seconds by default (`CHECK_TIMEOUT_MS`) before the database cancels it.
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
