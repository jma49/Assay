# SQL safety rules

Checks can only read. Three independent layers make sure of it.

## 1. Validation

Every check is validated when it is saved and again before it runs. These are rejected:

- **Writes and schema changes** — `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `UPSERT`, `TRUNCATE`, `CREATE`, `DROP`, `ALTER`, `RENAME`, `COPY`, `REFRESH`, `COMMENT ON`, `SECURITY LABEL`, and `SELECT … INTO` outside a `DO` block (it creates a table).
- **Permissions and sessions** — `GRANT`, `REVOKE`, `SET`, `SET ROLE / SESSION / LOCAL`, `RESET`, `DISCARD`, `LOAD`, `IMPORT`.
- **Transactions and locks** — `COMMIT`, `ROLLBACK`, `SAVEPOINT`, `LOCK`, `FOR SHARE`, `FOR KEY SHARE`.
- **Maintenance and messaging** — `VACUUM`, `REINDEX`, `CLUSTER`, `LISTEN`, `UNLISTEN`, `NOTIFY`, `CALL`, `EXECUTE`, `PREPARE`, `DEALLOCATE`.
- **Functions with side effects** — terminating or cancelling sessions, reloading configuration, sleeping, advisory locks, reading server files, large objects and `dblink`.

Keywords inside comments and string literals are ignored, so a comment that mentions `DELETE` is fine.

## 2. A read-only transaction

Each check runs inside `BEGIN READ ONLY`, so PostgreSQL itself refuses to write even if something slips past validation.

## 3. A time limit

`statement_timeout` cancels a check after 30 seconds, or five minutes for queries that look long-running. A cancelled check is marked **failed**.

> Validation cannot see inside user-defined functions. Give Assay a database user that can only `SELECT`, and the database enforces the rest.

## See also

- [Writing checks](/docs/writing-checks)
- [Deployment](/docs/deployment) — the security checklist.
