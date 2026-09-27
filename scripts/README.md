# Scripts

Command-line entry points. They hold no business logic: each one calls a
service in `src/server/services`, so a check runs the same way from the
command line, the schedule and the web app. Run them with `tsx`, which
resolves the `@/` alias.

| Script | What it does |
|---|---|
| `run-all-scripts.ts [all\|scheduled] [--dry-run]` | Runs checks. `scheduled` runs each scheduled check once per cron slot; the GitHub Actions schedule calls it. |
| `run-sql.ts <scriptId>` | Runs one check; the manual GitHub workflow calls it. |
| `scheduler/task-scheduler.ts` | An always-on scheduler, for hosts that keep a process running. |
| `demo/seed-demo.ts` | Recreates the demo schema and its checks. |
| `set-user-role.ts` | Assigns a role to a user by email. |

The database connections come from `DATABASE_URL` and `MONGODB_URI`; load
them with `-r dotenv/config` and `DOTENV_CONFIG_PATH=.env.local` locally.
