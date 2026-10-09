# Scripts

Command-line entry points. They hold no business logic: each calls a
service in `src/server/services`, so a check runs the same way from the
command line, the schedule and the web app. Run them with `tsx` (which
resolves the `@/` alias); locally, load `DATABASE_URL` and `MONGODB_URI`
with `DOTENV_CONFIG_PATH=.env.local tsx -r dotenv/config …`, as the npm
scripts do.

| Script | What it does |
|---|---|
| `run-all-scripts.ts [all\|scheduled] [--dry-run]` | Runs checks (`npm run sql:run-all`, `npm run sql:run-scheduled`). `scheduled` runs each scheduled check once per slot; the GitHub workflow calls it. In CI it prints only check ids, outcomes and row counts |
| `run-all-scripts.ts --check=<scriptId>` | Runs one check now; the workflow's `check_id` input calls it |
| `run-sql.ts <scriptId>` | Runs one check (`npm run sql:run`) |
| `demo/seed-demo.ts` | Recreates the demo schema and its checks (`npm run seed:demo`) |
| `set-user-role.ts` | Gives a role to someone who has signed in, by email (`npm run user:set-role`) |
| `backfill-check-state.ts [--dry-run] [--recompute]` | Rebuilds each check's state from its run history |
| `telegram-webhook.ts [--delete]` | Points the Telegram bot at this deployment (`npm run telegram:webhook`) |
| `brand/render-icons.ts` | Regenerates the favicon from `src/lib/brand/mark.ts` |

## Migrations

One-off data migrations in `migrations/`, each a dry run unless
`--apply`.

| Script | What it does |
|---|---|
| `mark-demo-seed.ts` | Marks the sample checks `demoSeed: true`, which demo access relies on. Applied |
| `set-run-expiry.ts` | Gives older runs `expiresAt`, so the retention TTL covers them. Applied |
| `backfill-run-fields.ts` | Gives pre-pipeline runs `checkId`, `finishedAt`, `outcome`, `rowCount`. Applied |
| `rename-collections.ts` (`npm run migrate:collections`) | Renames `sql_scripts` → `checks` and `result` → `runs` (the app also does it on start); `--merge` and `--drop-old` handle a database holding both names ([database.md](../docs/database.md#renamed-collections)). Applied |
| `set-delivery-updated-at.ts` | Gives older notification deliveries `updatedAt`, so the delivery TTL covers them ([database.md](../docs/database.md#alerts)) |
