# AI assistant

When the workspace has an AI key configured, three helpers are available.

| Helper | Where | Who |
|---|---|---|
| **Generate SQL** | Editor toolbar, **AI** | Developers and above |
| **Explain / optimise SQL** | Editor toolbar, **AI** | Developers and above |
| **Explain an error** | Full report of a failed run | Everyone |

The AI sees your question, the SQL and the table structure of the database, never the data rows.

## Limits

To keep costs predictable, each person can make **30 AI requests per hour**. A description can be up to 2,000 characters, SQL up to 20,000 and an error message up to 4,000.

> Always read AI-written SQL before saving it. It is validated like any other check, so it still cannot write.

## See also

- [Writing checks](/docs/writing-checks)
- [Environment variables](/docs/environment-variables) — `GEMINI_API_KEY`.
