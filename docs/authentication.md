# Authentication

Assay signs people in with **Google** and **GitHub** through
[Better Auth](https://www.better-auth.com). Users, sessions and linked
accounts live in the app's own MongoDB (collections `user`, `session`,
`account`, `verification`), so a self-hosted Assay needs no identity service.

Sign-up is public: anyone who signs in starts as a **viewer**. An admin gives
roles on the Members page (by email; the person must have signed in once) or
with `npm run user:set-role -- <email> <role>`. `ALLOWED_EMAIL_DOMAINS`
(comma-separated) limits who may sign in at all.

## Setup

| Variable | |
| --- | --- |
| `BETTER_AUTH_SECRET` | 32+ random bytes (`openssl rand -base64 32`). Signs session cookies. |
| `BETTER_AUTH_URL` | The public URL, e.g. `https://assay.example.com` (falls back to `APP_URL`). |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud → APIs & Services → Credentials → OAuth client ID (Web). Authorised redirect URI: `<BETTER_AUTH_URL>/api/auth/callback/google`. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub → Settings → Developer settings → OAuth Apps. Callback URL: `<BETTER_AUTH_URL>/api/auth/callback/github`. |

A provider appears on the sign-in page once its two variables are set. The
same person signing in with Google and GitHub is one user, but accounts are
only linked when the provider reports the email as verified.

### Local development without OAuth apps

With `AUTH_DEV_PASSWORD_LOGIN=true` and `next dev`, the sign-in page also
offers email and password. It is refused outside development whatever the
variable says. Give the account a role with `npm run user:set-role`.

## How it fits together

- `/api/auth/*` is Better Auth's handler (OAuth redirects, callbacks, session).
- The middleware only checks that a session cookie exists, to redirect
  signed-out visitors without a database call. Every page and API route
  verifies the session itself (`validateApiAuth`, `withAuth`).
- A signed session cookie caches the session for five minutes, so most API
  calls skip the database; revoking a session takes effect within that time.
- Roles stay in `user_roles`; permissions are checked by `rbac.ts` as before.
- **Removing someone's role** on the Members page also deletes their sessions
  and disables their API keys (within the five-minute cookie cache). Sign-up
  is public, so if they sign in again they start over as a viewer and must
  create new keys. At least one active admin always remains.

## Moving from Clerk

Accounts made with Clerk keep their role: the first time someone signs in
with a **verified** email that a role was given to, the role moves to their
new user id and the Clerk id is kept as `legacyUserId`. Unverified emails are
never linked. Nothing else needs migrating; Clerk variables can be removed.
