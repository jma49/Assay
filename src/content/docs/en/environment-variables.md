# Environment variables

Copy `.env.example` to `.env.local` for local work, or add these to your host.

## Required

| Variable | Purpose |
|---|---|
| `BETTER_AUTH_SECRET` | Signs session cookies; 32+ random bytes. |
| `BETTER_AUTH_URL` | Public URL of the app, e.g. `https://assay.example.com`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client; callback `/api/auth/callback/google`. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth app; callback `/api/auth/callback/github`. |
| `MONGODB_URI` | MongoDB connection string. The database is the one named in its path, else `MONGODB_DB_NAME`, else `sql_script_monitoring`; users, roles, checks and runs all live there. |
| `RUN_RETENTION_DAYS` | Days a run is kept (default 90; `0` keeps runs forever). |
| `DATABASE_URL` | The PostgreSQL database checks run against. |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL. |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token. |

## Optional

| Variable | Purpose |
|---|---|
| `AI_ENABLED` | `true` turns on the [AI assistant](/docs/ai-assistant). Off by default, because every request spends AI Gateway credits. |
| `AI_GATEWAY_API_KEY` | AI Gateway key for hosts other than Vercel. On Vercel the gateway authenticates with OIDC and no key is needed. |
| `AI_GATEWAY_MODEL` | Overrides the default model, as a `provider/model` id. |
| `DEMO_MODE` | `true` makes the workspace a public demo: viewers may run the seeded demo checks, 20 runs per hour each, and visitors can try it as guests without an account (see [Accounts and roles](/docs/accounts-and-roles)). Leave unset otherwise. |
| `CHECK_TIMEOUT_MS` | How long one statement of a check may run before PostgreSQL stops it. Default 30000 (30 s), at most 300000. |
| `CHECK_CONCURRENCY` | How many checks one server instance runs at the same time. Default 4. |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated email domains allowed to sign in. Empty allows everyone. |
| `CA_CERT_BLOB_URL` | CA certificate URL when PostgreSQL requires one for SSL. |

> Only variables starting with `NEXT_PUBLIC_` reach the browser. Never give a secret that prefix.

## See also

- [Deployment](/docs/deployment)
