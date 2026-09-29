# Core concepts

## A check is a query that should return nothing

A **check** is one PostgreSQL `SELECT` that looks for bad data: orders without items, payments larger than the order, stock below zero. If the data is healthy the query returns no rows. Every row it returns is something a person should look at.

## Three statuses

| Status | Meaning |
|---|---|
| **Clean** | The query ran and returned no rows. |
| **Issues** | The query ran and returned rows. They are saved with the run. |
| **Broken** | The query could not run, for example a syntax error or a timeout. |

A broken query is never reported as clean data: it is marked Broken, not Clean.

## Read-only by design

Checks can only read. Every check is validated when it is saved and again before it runs, and it runs inside a `READ ONLY` transaction with a time limit, so the database itself rejects any write. See [SQL safety rules](/docs/sql-safety).

## Where things live

- **PostgreSQL** — the databases your checks read: `DATABASE_URL` and any [data sources](/docs/data-sources) an admin added.
- **MongoDB** — the checks themselves, their run history, versions, approvals and user roles.
- **Redis (Upstash)** — a cache that keeps pages fast.

## Tags and scope

Give each check **tags** (up to eight) to group and filter them, and a **scope** that says which part of the data it covers, such as *orders* or *payments*.

## See also

- [Writing checks](/docs/writing-checks)
- [Running checks](/docs/running-checks)
