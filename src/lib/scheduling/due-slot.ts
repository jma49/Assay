import { CronExpressionParser } from "cron-parser";

/**
 * How late a scheduled run may still start. GitHub Actions cron often fires
 * 10-30 minutes late; after a longer outage, old slots are dropped rather
 * than all run at once.
 */
export const CATCH_UP_WINDOW_MS = 2 * 60 * 60 * 1000;

function parse(cronSchedule: string, currentDate: Date) {
  return CronExpressionParser.parse(cronSchedule, { currentDate, tz: "UTC" });
}

/**
 * The scheduled slot a check should run for now, or null. A slot is due when
 * it is the latest one at or before `now`, falls inside the catch-up window,
 * and is newer than the slot the check last ran for. Recording the returned
 * slot after running makes repeated triggers idempotent.
 */
export function dueSlot(
  cronSchedule: string,
  now: Date,
  lastRunSlot: Date | null | undefined,
): Date | null {
  let latest: Date;
  try {
    // +1 ms so a slot exactly at `now` counts as already reached.
    latest = parse(cronSchedule, new Date(now.getTime() + 1)).prev().toDate();
  } catch {
    return null;
  }
  if (now.getTime() - latest.getTime() > CATCH_UP_WINDOW_MS) return null;
  if (lastRunSlot && lastRunSlot.getTime() >= latest.getTime()) return null;
  return latest;
}

/** The next time a cron schedule fires after `now`, or null if it is invalid. */
export function nextRunAt(cronSchedule: string, now: Date): Date | null {
  try {
    return parse(cronSchedule, now).next().toDate();
  } catch {
    return null;
  }
}
