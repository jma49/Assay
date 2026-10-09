# Deployment

Assay is one Next.js app. The reference deployment is Vercel (Fluid
Compute), MongoDB Atlas, a PostgreSQL database to check and Upstash Redis;
any Node.js host works the same way (`npm run build && npm start`).

`main` is production: every merge deploys to Vercel, and there is no
staging. Pull requests get no preview deployments; run `npx vercel deploy`
by hand when one is needed.

## Configuration

`.env.example` lists every variable with a comment. For production:

| What | Variables |
| --- | --- |
| Sign-in | `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID/SECRET` and/or `GITHUB_CLIENT_ID/SECRET` ([authentication.md](authentication.md)) |
| Data | `MONGODB_URI` (plus `MONGODB_DB_NAME` unless the URI names the database), `DATABASE_URL` for a SELECT-only role ([architecture.md](architecture.md#read-only-in-layers)), `UPSTASH_REDIS_REST_URL/TOKEN` |
| Alerts and data sources | `ASSAY_SECRET_KEY` (seals their secrets; changing it makes them unreadable, see [secret-rotation.md](secret-rotation.md)), `APP_URL`, `CRON_SECRET` |
| Scheduling | `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` |
| Optional | `AI_ENABLED=true` with AI Gateway; `DEMO_MODE=true` (the public demo only); Slack, Discord and Telegram app settings ([notifications.md](notifications.md)); `ALLOWED_EMAIL_DOMAINS`; run limits `CHECK_TIMEOUT_MS`, `CHECK_CONCURRENCY`, `PG_POOL_MAX`, `PG_SOURCE_POOL_MAX`, `RUN_RETENTION_DAYS`; `ALLOW_PRIVATE_DATA_SOURCES`; `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` |

Set `BETTER_AUTH_URL` and `APP_URL` to the public URL; OAuth callbacks are
`<BETTER_AUTH_URL>/api/auth/callback/google` and `…/github`.

**Missing configuration fails closed.** A production server (`next start`
or a Vercel function) exits on start when `BETTER_AUTH_SECRET`,
`MONGODB_URI`, `DATABASE_URL` or `APP_URL` is unset or blank, logging
`Assay refuses to start: missing required environment variable(s) …` with
names only. On Vercel, `VERCEL_PROJECT_PRODUCTION_URL` stands in for
`APP_URL`. The check (`src/server/startup-config.ts`, called from
`src/instrumentation.ts`) skips `next build`, development and tests, so CI
builds without secrets. Optional features stay off with one warning each:
no sign-in provider, no `ASSAY_SECRET_KEY`, no `CRON_SECRET` (dispatch
refuses calls), no `SENTRY_DSN`. A missing Upstash URL is reported by the
client and `/api/health` shows Redis as `unconfigured`. The edge proxy also
refuses requests without `BETTER_AUTH_SECRET`.

**Private databases.** Data-source hosts on private networks are refused
([architecture.md](architecture.md#data-sources)). A self-hosted deployment
whose databases sit on a private network sets
`ALLOW_PRIVATE_DATA_SOURCES=true`; such hosts may then use
`sslmode=disable`.

**TLS for `DATABASE_URL`.** With `sslmode` set to `prefer`, `require`,
`verify-ca` or `verify-full`, Assay removes the parameter and connects with
full verification: the chain against the system CAs (or `CA_CERT_BLOB_URL`)
and the host name. This keeps pg 9's weaker libpq meaning of `require` from
ever applying; existing `sslmode=require` URLs need no change.
`sslmode=disable` stays plaintext (local development), and URLs naming
certificate files (`sslrootcert`, `sslcert`, `sslkey`) are left to pg.

## Scheduled runs

A QStash schedule calls `POST /api/cron/run-scheduled` every 30 minutes. The
endpoint accepts the QStash signature or the `CRON_SECRET` bearer, runs
every check whose slot is due, defers what cannot finish within the
function's 300 s, and sends alerts. It reports to the Sentry Cron monitor
`scheduled-checks-trigger` (15-minute margin), created on its first call.

Set up QStash once per deployment:

1. In the [Upstash console](https://console.upstash.com/qstash), copy the
   current and next signing keys into `QSTASH_CURRENT_SIGNING_KEY` and
   `QSTASH_NEXT_SIGNING_KEY` (on Vercel: Production, then redeploy).
2. In QStash → Schedules, create a POST schedule to
   `<APP_URL>/api/cron/run-scheduled` (exactly the `APP_URL` origin; the
   signature covers the URL), cron `*/30 * * * *`.
3. In QStash → Logs, the first call returns 200 with counts like
   `{"ran":1,"failed":0,"deferred":0,"skipped":4}`. A 401 means the keys or
   the URL do not match.

**Fallback:** `.github/workflows/sql-check-cron.yml` asks for a run every 30
minutes, but GitHub starts it hours late, so it only catches what the
trigger missed; slot claims keep the two from running a slot twice. It needs
the repository secrets `DATABASE_URL`, `MONGODB_URI`, `APP_URL` and
`CRON_SECRET` (plus the certificate URLs if PostgreSQL uses them,
`ASSAY_SECRET_KEY` for added data sources, and `SENTRY_DSN` for check-ins);
`MONGODB_DB_NAME` and the run limits go in repository variables. Without
the secrets it skips quietly. GitHub disables scheduled workflows after 60
days without repository activity; re-enable with
`gh workflow enable sql-check-cron.yml`. A self-hosted setup can run
`npm run sql:run-scheduled` from cron instead.

**Monitoring.** Each scheduled run writes a heartbeat to MongoDB;
`GET /api/health` reports the scheduler `stale` (HTTP 503) when no scheduled
run started in 12 hours (manual runs do not count). With `SENTRY_DSN` set
as a repository secret, the workflow also sends check-ins to the monitor
`scheduled-sql-checks`, which alerts after 12 hours without one, on a
failed run, or on a run over 20 minutes. Turn on each monitor's alert in
Sentry (Crons → the monitor → Alerts) after its first check-in. An external
uptime monitor on `/api/health` works too.

## First deploy

1. Create the read-only PostgreSQL role
   ([architecture.md](architecture.md#read-only-in-layers)).
2. Deploy, sign in once, and make yourself admin with the production
   variables loaded: `npm run user:set-role -- you@example.com admin`.
3. Optionally `npm run seed:demo` (`SEED_DATABASE_URL` names a role that may
   create tables, since `DATABASE_URL` is read-only).
4. With Telegram configured, run `npm run telegram:webhook` once.
5. Set up the QStash schedule and MongoDB backups
   ([backup-restore.md](backup-restore.md)).

Indexes and collection renames happen on start
([database.md](database.md#renamed-collections)).

## After a deploy

Smoke test on the production URL:

- `GET /api/health` returns 200 and the scheduler state you expect.
- `curl -sI <url>/` shows `Content-Security-Policy`, `X-Frame-Options: DENY`,
  `Strict-Transport-Security` and the other headers from `next.config.mjs`.
- Signed out, `/checks` redirects to `/sign-in`; Google and GitHub sign-in
  land on `/checks`.
- Run a check from its page: the run appears in its history and on Runs.
- The latest scheduled call succeeded (QStash → Logs, or the **Send
  alerts** step of the GitHub workflow returned JSON; a 401 means
  `CRON_SECRET` differs).
- Settings → Notifications → **Send test** reaches a channel.
- With `DEMO_MODE=true`: a private window can open `/demo`, run a sample
  check, and is sent to sign up for `/checks/new`.
- An MCP client connects with an API key or OAuth ([mcp.md](mcp.md));
  revoking the key cuts it off.

## Rollback

1. Vercel dashboard → Deployments → the last good deployment → **Redeploy**
   (uncheck "Use existing Build Cache" when the build itself is suspect).
2. Wait for it to go live, then run the smoke test above.

Data migrations roll forward only: before rolling back below a deploy that
introduced one, read [backup-restore.md](backup-restore.md) and, for the
collection rename, [database.md](database.md#renamed-collections).
