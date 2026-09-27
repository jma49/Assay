# Scripts

Command-line entry points. They hold no business logic: each one calls a
service in `src/server/services`, so a check runs the same way from the
command line, the schedule and the web app. Run them with `tsx`, which
resolves the `@/` alias.

| Script | What it does |
|---|---|
| `run-all-scripts.ts [all\|scheduled] [--dry-run]` | Runs checks. `scheduled` runs each scheduled check once per cron slot; the GitHub Actions schedule calls it. |
| `run-sql.ts <scriptId>` | Runs one check; the manual GitHub workflow calls it. |
| `demo/seed-demo.ts` | Recreates the demo schema and its checks. |
| `set-user-role.ts` | Assigns a role to someone who has signed in, by email. |
| `backfill-check-state.ts [--dry-run] [--recompute]` | Rebuilds each check's state from its run history. |
| `telegram-webhook.ts [--delete]` | Points the Telegram bot at this deployment. |
| `migrations/*.ts [--apply]` | One-off data migrations; dry run unless `--apply`. |
| `brand/render-icons.ts` | Regenerates the favicon from the beetle grid. |

The database connections come from `DATABASE_URL` and `MONGODB_URI`; load
them with `-r dotenv/config` and `DOTENV_CONFIG_PATH=.env.local` locally.
