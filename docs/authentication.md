# Authentication

Assay signs people in with **Google** and **GitHub** through
[Better Auth](https://www.better-auth.com). Users, sessions and linked
accounts live in Assay's own MongoDB (`user`, `session`, `account`,
`verification`), so self-hosting needs no identity service.

Sign-up is public and everyone starts as a **viewer**. An admin gives roles
on the Members page (by email, once the person has signed in) or with
`npm run user:set-role -- <email> <role>`. `ALLOWED_EMAIL_DOMAINS`
(comma-separated) limits who may sign in at all.

## Setup

| Variable | |
| --- | --- |
| `BETTER_AUTH_SECRET` | 32+ random bytes (`openssl rand -base64 32`); signs session cookies |
| `BETTER_AUTH_URL` | The public URL, e.g. `https://assay.example.com` (falls back to `APP_URL`) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud → APIs & Services → Credentials → OAuth client ID (Web); redirect URI `<BETTER_AUTH_URL>/api/auth/callback/google` |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub → Settings → Developer settings → OAuth Apps; callback URL `<BETTER_AUTH_URL>/api/auth/callback/github` |

A provider appears on the sign-in page once both its variables are set.
Google and GitHub accounts with the same email are one user, but only when
the provider reports the email as verified.

**Locally without OAuth apps:** with `AUTH_DEV_PASSWORD_LOGIN=true` under
`next dev`, the sign-in page also offers email and password. It is refused
outside development whatever the variable says.

## How it fits together

- `/api/auth/*` is Better Auth's handler (OAuth redirects, callbacks,
  session).
- The proxy (`src/proxy.ts`) only checks that a session cookie exists, to
  redirect signed-out visitors without a database call. Every page and API
  route verifies the session itself (`validateApiAuth`, `withAuth`).
- A signed cookie caches the session for five minutes, so revoking a
  session takes effect within that time.
- Roles live in `user_roles`; `rbac.ts` checks permissions.
- **Removing someone's role** on the Members page deletes their sessions
  (within the cookie cache), deletes their API keys and disconnects their
  OAuth apps. If they sign in again they start over as a viewer. At least
  one active admin always remains.
- Better Auth is also the OAuth server for MCP clients ([mcp.md](mcp.md)).

**Accounts from Clerk** (the previous provider) keep their role: on the
first sign-in with a **verified** email that held a role, the role moves to
the new user id and the Clerk id is kept as `legacyUserId`
(`src/lib/auth/legacy-accounts.ts`). Unverified emails are never linked.
