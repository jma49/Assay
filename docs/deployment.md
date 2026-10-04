# Deployment

Assay runs as one Next.js app. The reference deployment is Vercel with
Fluid Compute, MongoDB Atlas, a PostgreSQL database to check, and Upstash
Redis; any Node.js host works the same way (`npm run build && npm start`).

## Branches and deploys

- Pull requests go straight to `main`: open the PR, wait for CI (typecheck,
  lint, knip, tests, build, and the visual comparison), and merge on green.
- `main` is production: every push to it deploys to Vercel. Merge to `main`
  only when the batch is verified. Pull requests get no preview
  deployments; run `npx vercel deploy` by hand when one is needed.

### Rollback

When a deploy breaks production, redeploy the last good build:

1. Open the Vercel dashboard → Deployments.
2. Find the last good deployment and choose **Redeploy**. Uncheck "Use
   existing Build Cache" when the build itself is suspect.
3. Wait for the new deployment to go live.

Data migrations roll forward only: do not roll back below a deploy that
introduced a migration without reading [backup-restore.md](backup-restore.md)
first.

Then smoke-test the rollback:

- `GET /api/health` returns 200 (and reports the scheduler state you expect).
- Signed out, `/checks` redirects to `/sign-in`; Google and GitHub sign-in
  work and land on `/checks`.
- Trigger one check by hand from its page: the run appears in its history
  and on the Runs page.

## Configuration

`.env.example` lists every variable with a comment. For production:

| What | Variables |
| --- | --- |
| Sign-in | `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL`, and `GOOGLE_CLIENT_ID/SECRET` and/or `GITHUB_CLIENT_ID/SECRET` |
| Data | `MONGODB_URI` (and `MONGODB_DB_NAME` unless the URI names the database), `DATABASE_URL` pointing at a SELECT-only role ([architecture.md](architecture.md#running-a-check)), `UPSTASH_REDIS_REST_URL/TOKEN` |
| Alerts and data sources | `ASSAY_SECRET_KEY` (required to add data sources or alert channels; changing it invalidates their sealed secrets — see [secret-rotation.md](secret-rotation.md) for the rotation and recovery procedure), `APP_URL`, `CRON_SECRET` |
| Optional | `AI_ENABLED=true` with AI Gateway, `DEMO_MODE=true` (the public demo only), the Slack, Discord and Telegram app settings ([notifications.md](notifications.md)), `ALLOWED_EMAIL_DOMAINS`, run limits (`CHECK_TIMEOUT_MS`, `CHECK_CONCURRENCY`, `PG_POOL_MAX`, `PG_SOURCE_POOL_MAX`, `RUN_RETENTION_DAYS`), `ALLOW_PRIVATE_DATA_SOURCES` (below), `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` (error tracking) |

**Data sources.** Besides `DATABASE_URL`, admins can add PostgreSQL
databases in Settings → Data sources; their connection strings are sealed
with `ASSAY_SECRET_KEY`. Hosts on private networks (10.x, 192.168.x,
localhost, `*.internal`, link-local) are refused, so a connection string
cannot reach internal services or the cloud metadata endpoint. A
self-hosted deployment whose databases sit on a private network sets
`ALLOW_PRIVATE_DATA_SOURCES=true`; such hosts may then also use
`sslmode=disable`. Public hosts always use verified TLS. Each instance
opens at most `PG_SOURCE_POOL_MAX` (3) connections per added source.

**TLS to PostgreSQL is always verified when `DATABASE_URL` asks for it.**
With `sslmode` set to `prefer`, `require`, `verify-ca` or `verify-full`, Assay
removes the parameter and connects with full verification: the certificate
chain against the system CAs (or `CA_CERT_BLOB_URL` when set) and the host
name. This is what pg 8 does today, made explicit so pg 9's weaker libpq
meaning of `require` never applies and pg's deprecation warning is not
printed. `sslmode=require` in an existing URL needs no change;
`sslmode=disable` stays plaintext (local development), and URLs naming
certificate files (`sslrootcert`, `sslcert`, `sslkey`) are left to pg.

OAuth callbacks are `<BETTER_AUTH_URL>/api/auth/callback/google` and
`…/github`; set `BETTER_AUTH_URL` and `APP_URL` to the public URL.

**Scheduled runs** come from `.github/workflows/sql-check-cron.yml` every 30
minutes. It needs the repository secrets `DATABASE_URL`, `MONGODB_URI`,
`APP_URL` and `CRON_SECRET` (plus the certificate URLs if PostgreSQL uses
them, `ASSAY_SECRET_KEY` once checks use an added data source, and `SENTRY_DSN` for the check-ins below); `MONGODB_DB_NAME` and the run limits go in repository variables with
the same values as the app. Without the secrets the workflow skips quietly.
A self-hosted setup can call `npm run sql:run-scheduled` from cron instead.

Every scheduled run writes a heartbeat to MongoDB. `GET /api/health`
reports the scheduler as stale when no scheduled run started in the last 90
minutes (HTTP 503); manual runs do not count.

With the `SENTRY_DSN` repository secret set, each scheduled run also sends
Sentry Cron check-ins (monitor `scheduled-sql-checks`, created on the first
check-in). Sentry alerts when a slot is missed, a run fails or it runs past
20 minutes, so the alert does not depend on GitHub Actions. Turn on the
monitor's alert in Sentry (Crons → the monitor → Alerts) after the first
check-in. An external uptime monitor on `/api/health` works too.

GitHub disables scheduled workflows in a repository with no activity for 60
days, and says so on the Actions tab. The stale heartbeat and the missed
check-ins both show it; re-enable with
`gh workflow enable sql-check-cron.yml`.

Keep MongoDB backups current: the [backup and restore runbook](backup-restore.md)
covers what is backed up, the schedule, and the restore procedure.

## First deploy

1. Create the read-only PostgreSQL role ([architecture.md](architecture.md#running-a-check)).
2. Deploy, sign in once, and make yourself admin:
   `npm run user:set-role -- you@example.com admin` (with the production
   variables loaded).
3. Optionally seed the demo schema and checks with `npm run seed:demo`
   (`SEED_DATABASE_URL` names a role that may create tables, since
   `DATABASE_URL` is read-only).
4. With Telegram configured, run `npm run telegram:webhook` once.

Indexes are created on start, and the app renames the old collection names
(`sql_scripts`, `result`) itself; `npm run migrate:collections` shows what it
would do and handles a database that holds both names
([scripts/README.md](../scripts/README.md)).

## After a deploy

A short smoke test on the production URL:

- `curl -sI <url>/` shows `Content-Security-Policy`, `X-Frame-Options: DENY`,
  `Strict-Transport-Security` and the other headers from `next.config.mjs`.
- Signed out, `/checks` redirects to `/sign-in`; Google and GitHub sign-in
  work and land on `/checks`.
- Run a check from its page: the run appears in its history and on the Runs
  page.
- In Actions, the latest **Scheduled SQL checks** run succeeded, and its
  **Send alerts** step returned JSON (a 401 means `CRON_SECRET` differs).
- Settings → Notifications → **Send test** reaches a channel.
- With `DEMO_MODE=true`: a private window can open `/demo`, run a sample
  check, and is sent to sign up for `/checks/new`.
- An MCP client connects with an API key or OAuth
  ([mcp.md](mcp.md)); revoking the key cuts it off.
