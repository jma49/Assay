# AGENTS.md — Assay

Maintenance and agent contract for the Assay repository.
`README.md` explains how to *use* Assay; this file explains how to *change*
it without breaking production assumptions.

An explicit instruction from the maintainer overrides this file.

---

## Project

**Assay** is an open-source SQL data-quality tool for PostgreSQL.

- A **check** is a read-only SQL query whose returned rows are problems.
- Checks run on schedule or on demand; results are stored, diffed, and alerted.
- Non-admin changes can require approval; agents can drive checks via MCP.

**Stack:** Next.js 16 (App Router) · TypeScript · MongoDB (app state) ·
PostgreSQL (checked DBs) · Upstash Redis · Better Auth · Vitest.

**Live demo:** https://assay.majincheng.com
**License:** Apache-2.0

---

## Layout

```
src/
  domain/          # Pure types and rules: outcomes, state, diffs, schedules, alerts. No I/O.
  server/
    services/      # Use cases: runCheck, approvals, notifications, batches…
    repos/         # MongoDB access
    runs/          # Run history, samples, fingerprints
    datasource/    # PostgreSQL adapters, pools, connection guards
    notify/        # Alert channels
    health/        # /api/health probes (mongo, redis, pg, scheduler)
    logging/       # Structured JSON logs + request id
    mcp/           # MCP server tools and auth
    http/          # withAuth, ApiError, route helpers
    crypto/        # Sealed secrets (AES-256-GCM)
    concurrency/   # Semaphores, leases
    net/           # Fetch guards, SSRF/DNS-rebinding protection
    integrations/  # Third-party integrations
    edit-history/  # Check edit audit trail
  lib/             # Auth, DB clients, SQL validation, cache, scheduling, utilities
  contracts/       # Shared request/response types and zod schemas
  app/             # Routes; API routes are thin adapters over services
  components/      # UI (see DESIGN.md before touching)
  client/ content/ # Client helpers and in-app docs content
  proxy.ts instrumentation.ts sentry.*.config.ts
scripts/           # CLIs (seed, run scheduled, migrations, role helpers)
docs/              # architecture, deployment, auth, notifications, mcp, database, roadmap
```

Dependencies point inward:

- Server: `app/api → server/http → server/services → server/repos + domain`
- Browser: `app → components → client`

`domain/` must not import from `app/`, `server/`, or UI code.

---

## Working principles

1. **Smallest correct diff.**
   Ship the smallest change that solves the stated problem. Prove it with
   the narrowest real verification. Expand scope only when evidence demands it.
2. **No scope creep.**
   Do not add a database engine, alert channel, flag, dependency, or
   abstraction unless the current request cannot be satisfied without it.
   Prefer quieter defaults over new options.
3. **Outcome → red lines → verification.**
   Before implementing: state the expected outcome, hard prohibitions, and
   how success will be verified. After implementing: run that verification.
   Do not claim done on intuition.
4. **Read before acting.**
   Read the relevant service, repo, schema, and tests before editing. Do not
   invent a parallel path when a registry, validator, or shared entry point
   already exists.
5. **One reasonable assumption.**
   If key context is missing, make one reasonable assumption, state it in
   the change notes, and proceed. Do not block on speculative completeness.

---

## Hard red lines

Non-negotiable. A change violating them is incomplete.

### Safety

- **Checks are read-only.** SQL must pass the static read-only validator
  and run inside a read-only transaction with a statement timeout. Never
  weaken the validator to "make a check work."
- **No write path to monitored databases** from app code paths that execute
  checks (including MCP tools).
- **Secrets stay sealed.** Data-source connection strings and channel
  secrets are encrypted with `ASSAY_SECRET_KEY`, never returned by APIs,
  never logged in full.
- **SSRF guards stay on.** Host resolution must refuse private/loopback/
  link-local addresses unless `ALLOW_PRIVATE_DATA_SOURCES=true` is
  explicitly set for self-hosted private networks.
- **TLS verification** for public PostgreSQL hosts is required.

### Concurrency and state

- **All check execution goes through `runCheck`.** Manual, scheduled,
  batch, API, and MCP triggers must not open a second execution path.
- **Per-check lease + fencing token** must be respected. A run whose lease
  expired must not overwrite newer state.
- **Check state is stored on the check document**, not rebuilt from full
  history on every request.

### Results storage

- Store exact **row count**, a **capped sample** (default ≤500 rows / ≤1MB),
  and **row fingerprints** (capped). Do not store unbounded result sets on
  the run document (MongoDB 16MB limit).

### Auth and roles

- New accounts default to **viewer**. Privilege escalation is an explicit
  admin action.
- Non-admin script create/edit/delete goes through **approval** when review
  is enabled. Do not bypass approval in "convenience" APIs.

### Agent / MCP

- MCP tools operate with the caller's permissions only.
- Destructive or privileged actions (approve as admin, manage data sources,
  change roles) must not be exposed as unconstrained tools.
- Machine-oriented outputs must remain stable (see Public contracts).

---

## Public contracts

Treat these as API surface:

| Contract | Stability rule |
|----------|----------------|
| Check outcome enum | `clean` \| `issues` \| `error` (do not rename casually) |
| Run document shape | count + sample + fingerprints + outcome + timing |
| Alert event types | outcome changes, new rows, recovery, broken query |
| `GET /api/health` | Public, no auth. `200` = ok, `503` = degraded. Reports component name/status/latency only — never internals or error details |
| Scheduler heartbeat | `scripts/run-all-scripts.ts` writes it; health reports `stale` when no scheduled run started in the last hour (`HEARTBEAT_STALE_MS`) |
| Dead-letter API | `GET /api/notifications/deliveries/failed` + `POST .../requeue`, guarded by `NOTIFICATION_MANAGE` |
| Sentry | `@sentry/nextjs` v11, `withSentryConfig` imported from `@sentry/nextjs/config`. No DSN = SDK disabled. Error tracking only: no tracing, no replay, `sendDefaultPii` off. Never send raw pg error fields (`detail`, `hint`, `internalQuery`) |
| Structured logs | One JSON object per line; request id via `runWithRequestId`. Never log secrets/PII in full |
| MCP tool names and args | Additive changes preferred; breaking changes need migration notes |
| Cron / scheduled runner | GitHub workflow `.github/workflows/sql-check-cron.yml` runs `npx tsx scripts/run-all-scripts.ts "$EXECUTION_MODE"`; `npm run sql:run-scheduled` is the local equivalent. `CRON_SECRET` (Bearer) guards `POST /api/notifications/dispatch` |
| Env var names in `.env.example` | Document every new required var |

In any machine/JSON mode: **stdout carries one result object** (or a
documented stream). Status noise goes to logs/stderr, not mixed into the
payload.

---

## Commands

Authoritative local commands (adjust if scripts are renamed; update this
table in the same PR):

```bash
# Quality gate (run before every commit / PR)
npm run typecheck && npm run lint && npm test
npx knip
npm run build

# App
cp .env.example .env.local   # fill Mongo, Redis, Postgres, auth
npm run seed:demo            # optional demo schema + checks
npm run dev

# Privileges
npm run user:set-role -- you@example.com admin

# Scheduled execution (self-hosted)
npm run sql:run-scheduled

# Migrations / maintenance
npm run migrate:collections  # when collection renames are in play
```

CI refuses merge if typecheck, lint, knip, tests, or build fail.

---

## Architecture rules

1. **Routes are thin.** Parse input, call a service, map errors. Business
   logic does not live in route handlers.
2. **Services own use cases.** `runCheck`, approval apply, notification
   dispatch, batch orchestration live under `server/services/`.
3. **Repos own persistence.** No ad-hoc Mongo access scattered through routes.
4. **Domain is pure.** Outcome transitions, diff rules, schedule parsing
   helpers that are logic-only stay testable without I/O.
5. **One pool registry for data sources.** Added sources are keyed by
   id/version; editing a source invalidates pools and schema cache.
6. **Notification outbox.** Prefer durable outbox / idempotent send over
   fire-and-forget when changing alert paths.

See `docs/architecture.md` for Today → Target detail. When you complete a
Target item, update that doc in the same change.

---

## Verification expectations

| Change type | Minimum proof |
|-------------|----------------|
| Domain rule (outcome, diff, schedule) | Unit tests in isolation |
| `runCheck` / lease / fencing | Integration-style test or scripted scenario with real Mongo + Postgres when feasible |
| SQL validator | Cases for blocked writes, allowed SELECT/WITH/EXPLAIN, quoted side-effect names |
| Data source save/test | SSRF rejection cases; secrets not echoed |
| Alert channel | Idempotent behavior documented; test send path not broken |
| API contract / MCP tool | Type/schema test; authz negative case |
| Observability (log/health/Sentry) | Unit test where possible; no secret/PII in output |
| UI only | Existing visual/unit coverage; no server invariant weakened |

Do not silence a failing check by raising timeouts, skipping tests, or
broadening permissions without a written reason in the PR.

---

## Hotspot map

Historical risk areas. Touching these requires extra care and matching tests.

| Hotspot | Paths (approx.) | Regression risk |
|---------|------------------|-----------------|
| Read-only enforcement | `lib/sql/*`, datasource execute path | Writes slip through; timeout bypass |
| Lease / fencing | `runCheck` service, check `lease` fields | Double runs; stale run overwrites state |
| Result sampling | run persistence | 16MB document failures; wrong counts |
| Data source secrets | crypto + data_sources repo | Secret leakage in API/logs |
| SSRF / DNS rebinding | datasource connection guard, `server/net` | Access to metadata/internal hosts |
| Approval flow | check change + approval services | Privilege bypass; unreviewed SQL live |
| Alert dispatch | notify + outbox | Duplicate storms; silent drop |
| MCP authz | `server/mcp/*` | Agent performs admin actions |
| Cron entry | scheduled runner + `CRON_SECRET` | Unauthorized trigger; missed runs |
| Scheduler slot claims | `run-checks.ts` claim/release | Silent slot loss on hard kill |

---

## Debugging

1. Confirm **root cause** before fixing — especially regressions ("it used
   to work").
2. If the cause is unknown, first make the failure **observable** (log with
   `requestId`/`checkId`/`runId`, metric, or failing test), then fix what
   the evidence shows.
3. Prefer one failure mode per change. Do not bundle drive-by refactors
   into a production bugfix.
4. For production incidents, check in order: lease contention → Postgres
   timeout/connectivity → Mongo write → alert delivery → cron trigger auth.

---

## Documentation duties

Update docs in the **same change** when you alter:

| Change | Doc |
|--------|-----|
| Run pipeline, concurrency, layers | `docs/architecture.md` |
| Collections, indexes, retention | `docs/database.md` |
| Auth providers, roles | `docs/authentication.md` |
| Channels, payload shape | `docs/notifications.md` |
| Tools, OAuth, API keys | `docs/mcp.md` |
| Env vars, deploy, smoke test | `docs/deployment.md` |
| CLI entry points | `scripts/README.md` |

User-facing `/docs` in the app (EN/ZH) must stay consistent with behavior
changes that operators see.

---

## Environment and deploy

Critical env (see `.env.example` for the full list):

- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, OAuth client IDs/secrets
- `MONGODB_URI`, `DATABASE_URL` (SELECT-only role),
  `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
- `ASSAY_SECRET_KEY` (required once data sources or alert secrets exist;
  **never rotate casually** — it decrypts stored secrets; rotation story:
  see docs)
- `APP_URL`, `CRON_SECRET`
- Optional: `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` (error tracking;
  unset = disabled), `AI_ENABLED`, channel credentials,
  `ALLOW_PRIVATE_DATA_SOURCES`, run limits

**Production expectations:**

- `DATABASE_URL` (and added sources) point at a **SELECT-only** role with
  `default_transaction_read_only` where possible.
- `main` is production: every push deploys to Vercel. There is no staging
  environment; verify on the PR before merging.
- After deploy: smoke checklist in `docs/deployment.md` (security headers,
  sign-in, one manual run, scheduled workflow, test alert, MCP key revoke).
- Startup should fail closed on missing critical configuration rather than
  run half-broken (target — not yet fully enforced; missing optional config
  currently warns).

---

## Workflow, commits, hygiene

- Work on feature branches (`muse/...`, `feat/...`, `fix/...`, `chore/...`).
  **Never commit directly to `main`.** Do not merge PRs unless told to.
- PRs target **`main`**. `main` is production: every push deploys to Vercel.
- Keep commits small and focused: one logical change per commit.
- Commit messages in **English**, Conventional Commits
  (`type(scope): summary`, e.g. `fix(sql): ...`). Explain *why* in the body
  when the change is not obvious.
- Before every commit, the quality gate must pass:
  `npm run typecheck`, `npm run lint`, `npm test`, `npx knip`,
  `npm run build`.
- Add or update tests alongside behavior changes, especially for
  security-sensitive code (SQL validation, auth, RBAC).
- Tests never touch real services: mock MongoDB, PostgreSQL, Redis, AI and
  chat APIs.
- The repository is public: anything committed stays readable in history
  even after a later delete.
  - Never commit secrets or env files. `.env.example` holds placeholders
    only; real values live in `.env.local` and Vercel. Test fixtures use
    obviously fake credentials.
  - Never commit runtime data or generated output: dumps, logs,
    `evals/results/`, `.visual/`, Playwright reports, `.next/`,
    `*.tsbuildinfo`, `node_modules/`.
  - When a new tool or script writes files into the repo, add its output
    to `.gitignore` in the same change.
  - Stage paths explicitly and read `git status` and `git diff --cached`
    before committing; do not `git add -A` blindly.
  - Delete files that are no longer used in the change that makes them
    unused.
  - If something sensitive was committed, a follow-up delete is not
    enough: stop and tell the maintainer (rotation + history rewrite).
- Delete a branch once its PR is merged.

## UI changes

- Read `DESIGN.md` before touching `src/components`, `src/app`, or
  `globals.css`. It holds the tokens, the type scale, the component rules,
  and the migration order.
- Style only through tokens: colour utilities from `@theme inline`,
  the `text-<level>` type scale, the `rounded-sm|md|lg|xl|full` radii.
  No hex values, raw palette classes, arbitrary sizes, or `dark:` colour
  overrides in components.
- Every list and detail view covers loading, empty and error states, and
  every user-facing string exists in English and Chinese.
- Look at the result before calling a UI change done:
  `npm run build && npm run visual:baseline` before the change,
  `npm run build && npm run visual` after it (needs `DEMO_MODE=true` and
  demo data). Label a PR that changes the look on purpose `visual-change`
  and list the intended differences.

## Code comments

- Do not write comments in Chinese.
- Prefer self-explanatory code: clear names and small functions over comments.
- Add brief English comments only where necessary: a non-obvious reason,
  a security constraint, or a workaround.

---

## Product north star (for prioritization)

When choosing what to build next, prefer in order:

1. **Reliability** — scheduling, leases, retries, no silent missed runs
2. **Observability** — structured logs, health/readiness, basic metrics
3. **Safety** — read-only, secrets, SSRF, authz
4. **Operator UX** — clear failures, approval, alert quality
5. **New features** — extra engines, channels, AI flourishes

Assay wins by being a check system teams can leave on overnight — not by
accumulating surface area.

---

## Related docs

| Doc | Role |
|-----|------|
| `docs/architecture.md` | Layers, run pipeline, concurrency, target architecture |
| `docs/database.md` | Collections, indexes, retention |
| `docs/deployment.md` | Env, deploy, smoke test |
| `docs/authentication.md` | Sign-in, roles |
| `docs/notifications.md` | Alert channels |
| `docs/mcp.md` | Agent tools and auth |
| `docs/roadmap.md` | Goals and planned work |
| `DESIGN.md` | UI tokens, type scale, component rules |
| `README.md` | Human onboarding |

---

*End of AGENTS.md*

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
