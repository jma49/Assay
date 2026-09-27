# AI assistant

When the workspace sets `AI_ENABLED=true`, three helpers are available; otherwise their buttons are hidden. Requests go through Vercel AI Gateway, which falls back to a second model if the first is unavailable.

| Helper | Where | Who |
|---|---|---|
| **Generate SQL** | Editor toolbar, **AI** | Developers and above |
| **Explain / optimise SQL** | Editor toolbar, **AI** | Developers and above |
| **Explain an error** | Full report of a failed run | Everyone |

The AI sees your question, the SQL and the table structure of the database, never the data rows.

## How Generate SQL checks its work

Generate SQL drafts a whole check, not just a query. Before the query reaches the editor, Assay:

1. validates it like any other check, so it cannot write;
2. dry-runs it once in a read-only transaction with a 10-second timeout, counting the rows it would flag today;
3. if the dry run fails, sends the database error back to the model for one repair attempt.

The notification tells you how many rows the check flags now, or why its dry run still failed.

## Limits

To keep costs predictable, each person can make **30 AI requests per hour**. A description can be up to 2,000 characters, SQL up to 20,000 and an error message up to 4,000.

> Always read AI-written SQL before saving it. It is validated like any other check, so it still cannot write.

## See also

- [Writing checks](/docs/writing-checks)
- [Environment variables](/docs/environment-variables) — `AI_ENABLED`, `AI_GATEWAY_API_KEY`.
