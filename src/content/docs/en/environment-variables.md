# Environment variables

Copy `.env.example` to `.env.local` for local work, or add these to your host.

## Required

| Variable | Purpose |
|---|---|
| `BETTER_AUTH_SECRET` | Signs session cookies; 32+ random bytes. |
| `BETTER_AUTH_URL` | Public URL of the app, e.g. `https://assay.example.com`. Falls back to `APP_URL`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client; callback `/api/auth/callback/google`. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth app; callback `/api/auth/callback/github`. |
| `MONGODB_URI` | MongoDB connection string. The database is the one named in its path, else `MONGODB_DB_NAME`, else `sql_script_monitoring`; users, roles, checks and runs all live there. |
| `DATABASE_URL` | The built-in data source: the PostgreSQL database checks run against unless they name another data source (Settings → Data sources). |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL. |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token. |

At least one sign-in provider (Google or GitHub) must be set.

## Running checks

| Variable | Purpose |
|---|---|
| `CHECK_TIMEOUT_MS` | How long a check's whole script may run, all statements together, before PostgreSQL stops it. Default 30000 (30 s); values are kept between 1000 and 300000. |
| `CHECK_CONCURRENCY` | How many checks one server instance runs at the same time; more wait for a free slot. Default 4. |
| `PG_POOL_MAX` | Most connections one server instance opens to `DATABASE_URL`. Default 10. |
| `PG_SOURCE_POOL_MAX` | Most connections one server instance opens to each data source added in Settings. Default 3. |
| `ALLOW_PRIVATE_DATA_SOURCES` | `true` lets added data sources use hosts on private networks (10.x, 192.168.x, localhost, `*.internal`), and lets those skip TLS. Off by default, so a connection string cannot reach internal services or the cloud metadata endpoint. Turn it on when self-hosting next to a private database. |
| `SEED_DATABASE_URL` | Optional. A role that may create tables, used only by `npm run seed:demo`. Lets `DATABASE_URL` be a SELECT-only role. |
| `RUN_RETENTION_DAYS` | Days a run is kept before MongoDB deletes it. Default 90; `0` keeps runs forever. |

The scheduled GitHub workflow runs checks outside your host, so it needs these too, along with `MONGODB_DB_NAME` and the certificate URLs; [Scheduling](/docs/scheduling) lists which to add as secrets and which as variables.

## Alerts

See [Notifications](/docs/notifications).

| Variable | Purpose |
|---|---|
| `ASSAY_SECRET_KEY` | Needed for alerts and data sources: 32 random bytes, base64 (`openssl rand -base64 32`). Encrypts channel secrets and data source connection strings, and signs OAuth state. Without it no destination or data source can be saved; changing it makes saved ones unreadable. |
| `APP_URL` | Public URL used in alert links and one-click redirects. On Vercel the production domain is used when unset. |
| `CRON_SECRET` | Bearer token the scheduled workflow sends to `POST /api/notifications/dispatch`. Unset, that endpoint refuses every call. Add it, with `APP_URL`, as a GitHub Actions secret too. |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | Enable **Add to Slack**. Redirect URL `<APP_URL>/api/integrations/slack/callback`. |
| `SLACK_SIGNING_SECRET` | Enables the **Acknowledge** and **Mute 24 h** buttons in Slack alerts. |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Enable **Add to Discord**. Redirect URL `<APP_URL>/api/integrations/discord/callback`. |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` | Enable Telegram: the bot from @BotFather, and its username without the `@`. |
| `TELEGRAM_WEBHOOK_SECRET` | In production, lets Telegram push updates to Assay; run `npm run telegram:webhook` once after setting it. Without it the settings page polls Telegram while someone links a chat. |

## Optional

| Variable | Purpose |
|---|---|
| `AI_ENABLED` | `true` turns on the [AI assistant](/docs/ai-assistant). Off by default, because every request spends AI Gateway credits. |
| `AI_GATEWAY_API_KEY` | AI Gateway key for hosts other than Vercel. On Vercel the gateway authenticates with OIDC and no key is needed. |
| `AI_GATEWAY_MODEL` | Overrides the default model, as a `provider/model` id. |
| `DEMO_MODE` | `true` makes the workspace a public demo: viewers may run the seeded demo checks, 20 runs per hour each, and visitors can try it as guests without an account (see [Accounts and roles](/docs/accounts-and-roles)). Leave unset otherwise. |
| `TRUSTED_PROXY_COUNT` | Self-hosted demo only: how many proxies in front of Assay append to `X-Forwarded-For`, so a guest's address is read from the entry the outermost of them added, not one the visitor made up. Default `1`; `0` trusts no forwarding header, so all guests share one quota. Ignored on Vercel, which sets the client address itself. |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated email domains allowed to sign in. Empty allows everyone. |
| `CA_CERT_BLOB_URL` | https:// URL of the CA certificate PostgreSQL's server certificate is verified against. With `CLIENT_CERT_BLOB_URL` and `CLIENT_KEY_BLOB_URL`, also a client certificate. |
| `AUTH_DEV_PASSWORD_LOGIN` | `true` also offers email and password sign-in, in local development only; ignored in production. |

> Only variables starting with `NEXT_PUBLIC_` reach the browser. Never give a secret that prefix.

## See also

- [Deployment](/docs/deployment)
