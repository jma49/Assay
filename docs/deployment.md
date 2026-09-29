# Deployment

Assay runs as one Next.js app. The reference deployment is Vercel with
Fluid Compute, MongoDB Atlas, a PostgreSQL database to check, and Upstash
Redis; any Node.js host works the same way (`npm run build && npm start`).

## Branches and deploys

- Work lands on `develop` through pull requests; CI (typecheck, lint, knip,
  tests, build, and the visual comparison) runs on each one.
- `main` is production: every push to it deploys. Promote `develop` with a
  pull request once a batch is verified. Pull requests get no preview
  deployments; run `npx vercel deploy` by hand when one is needed.

## Configuration

`.env.example` lists every variable with a comment. For production:

| What | Variables |
| --- | --- |
| Sign-in | `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL`, and `GOOGLE_CLIENT_ID/SECRET` and/or `GITHUB_CLIENT_ID/SECRET` |
| Data | `MONGODB_URI` (and `MONGODB_DB_NAME` unless the URI names the database), `DATABASE_URL` pointing at a SELECT-only role ([architecture.md](architecture.md#running-a-check)), `UPSTASH_REDIS_REST_URL/TOKEN` |
| Alerts | `ASSAY_SECRET_KEY` (never change it once channels are stored: it decrypts their secrets), `APP_URL`, `CRON_SECRET` |
| Optional | `AI_ENABLED=true` with AI Gateway, `DEMO_MODE=true` (the public demo only), the Slack, Discord and Telegram app settings ([notifications.md](notifications.md)), `ALLOWED_EMAIL_DOMAINS`, run limits (`CHECK_TIMEOUT_MS`, `CHECK_CONCURRENCY`, `PG_POOL_MAX`, `RUN_RETENTION_DAYS`) |

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
them); `MONGODB_DB_NAME` and the run limits go in repository variables with
the same values as the app. Without the secrets the workflow skips quietly.
A self-hosted setup can call `npm run sql:run-scheduled` from cron instead.

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
