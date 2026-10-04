# Scripts

Command-line entry points. They hold no business logic: each one calls a
service in `src/server/services`, so a check runs the same way from the
command line, the schedule and the web app. Run them with `tsx`, which
resolves the `@/` alias.

| Script | What it does |
|---|---|
| `run-all-scripts.ts [all\|scheduled] [--dry-run]` | Runs checks. `scheduled` runs each scheduled check once per cron slot; the GitHub Actions schedule calls it. In CI it prints only check ids, outcomes and row counts. |
| `run-all-scripts.ts --check=<scriptId>` | Runs one check now; the scheduled workflow's `check_id` input calls it. |
| `run-sql.ts <scriptId>` | Runs one check (`npm run sql:run`). |
| `demo/seed-demo.ts` | Recreates the demo schema and its checks. |
| `set-user-role.ts` | Assigns a role to someone who has signed in, by email. |
| `backfill-check-state.ts [--dry-run] [--recompute]` | Rebuilds each check's state from its run history. |
| `telegram-webhook.ts [--delete]` | Points the Telegram bot at this deployment. |
| `migrations/*.ts [--apply]` | One-off data migrations; dry run unless `--apply`. The first four below have been applied to production (the rename ran on start on 2026-09-28, after a backup); the rename also runs by itself on start. `set-delivery-updated-at.ts` is a release step of issue #213: |
| `migrations/mark-demo-seed.ts` | Marks the sample checks `demoSeed: true`, which demo access relies on. |
| `migrations/set-run-expiry.ts` | Gives older runs `expiresAt`, so the retention TTL covers them. |
| `migrations/set-delivery-updated-at.ts` | Gives older notification deliveries `updatedAt`, so the delivery retention TTL covers them (see Delivery retention in `docs/database.md`). |
| `migrations/backfill-run-fields.ts` | Gives pre-pipeline runs `checkId`, `finishedAt`, `outcome`, `rowCount`. |
| `migrations/rename-collections.ts` (`npm run migrate:collections`) | Renames `sql_scripts` → `checks` and `result` → `runs`. The app does this on start; the script shows the state first and, with `--merge`, copies an old collection into the new one when both hold documents (`--drop-old` then drops the old one once every document arrived). |
| `brand/render-icons.ts` | Regenerates the favicon from the Row A mark in `src/lib/brand/mark.ts`. |

The database connections come from `DATABASE_URL` and `MONGODB_URI`; load
them with `-r dotenv/config` and `DOTENV_CONFIG_PATH=.env.local` locally.
