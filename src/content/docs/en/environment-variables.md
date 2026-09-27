# Environment variables

Copy `.env.example` to `.env.local` for local work, or add these to your host.

## Required

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (public). |
| `CLERK_SECRET_KEY` | Clerk secret key. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/dashboard` |
| `MONGODB_URI` | MongoDB connection string. The database name defaults to `sql_script_monitoring`. |
| `DATABASE_URL` | The PostgreSQL database checks run against. |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL. |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token. |

## Optional

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Turns on the [AI assistant](/docs/ai-assistant). |
| `DEMO_MODE` | `true` makes the workspace a public demo: viewers may run the seeded demo checks, 20 runs per hour each. Leave unset otherwise. |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated email domains allowed to sign in. Empty allows everyone. |
| `CA_CERT_BLOB_URL` | CA certificate URL when PostgreSQL requires one for SSL. |
| `SCHEDULER_API_TOKEN` | Token for the standalone scheduler's management API. |

> Only variables starting with `NEXT_PUBLIC_` reach the browser. Never give a secret that prefix.

## See also

- [Deployment](/docs/deployment)
