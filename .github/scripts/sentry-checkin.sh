#!/usr/bin/env bash
# Sends a Sentry Cron check-in for the scheduled workflow, so a schedule that
# stops firing or fails raises a Sentry alert outside GitHub Actions.
#   sentry-checkin.sh in_progress|ok|error
# Needs SENTRY_DSN; without it, does nothing. Never fails the job.
set -uo pipefail
status="$1"
[ -n "${SENTRY_DSN:-}" ] || { echo "SENTRY_DSN is not set; skipping the Sentry check-in."; exit 0; }

# DSN: https://<public_key>@<host>/<project_id>
rest="${SENTRY_DSN#*://}"
key="${rest%%@*}"
host_path="${rest#*@}"
host="${host_path%%/*}"
project="${host_path##*/}"
url="https://${host}/api/${project}/cron/${MONITOR_SLUG:-scheduled-sql-checks}/${key}/"

body=$(printf '{"status":"%s","monitor_config":{"schedule":{"type":"crontab","value":"*/30 * * * *"},"checkin_margin":30,"max_runtime":20,"timezone":"UTC"}}' "$status")
if ! curl --silent --show-error --fail --max-time 15 -o /dev/null \
  -X POST -H "Content-Type: application/json" --data "$body" "$url"; then
  echo "::warning::Sentry check-in ($status) failed."
fi
exit 0
