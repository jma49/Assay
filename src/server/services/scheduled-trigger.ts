import * as Sentry from "@sentry/nextjs";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { recordHeartbeat, SCHEDULER_NAME } from "@/server/repos/heartbeat-store";
import { errorKind } from "@/lib/utils/public-log";
import { logError } from "@/server/logging/log";
import { dispatchNow } from "@/server/services/notify-deps";
import { checkTimeoutMs, DISPATCH_RESERVE_MS, FUNCTION_MAX_DURATION_S, RUN_OVERHEAD_MS, runCheckNow } from "@/server/services/run-check-deps";
import { mongoRunChecksStore, runChecks, type CheckRunReport } from "@/server/services/run-checks";

/** The Sentry Cron monitor of the HTTP trigger; GitHub's fallback has its own. */
const TRIGGER_MONITOR = "scheduled-checks-trigger";

export interface TriggerSummary {
  ran: number;
  failed: number;
  deferred: number;
  skipped: number;
}

/** Counts only: the response is stored by the caller (QStash keeps it in its logs). */
export function summarize(reports: CheckRunReport[]): TriggerSummary {
  const count = (status: CheckRunReport["status"]) => reports.filter((r) => r.status === status).length;
  const ran = count("ran");
  const failed = count("failed");
  const deferred = count("deferred");
  return { ran, failed, deferred, skipped: reports.length - ran - failed - deferred };
}

/**
 * The latest moment a check may start and still finish, be saved and have
 * its alerts sent inside one function.
 */
export function startDeadline(startedAt: number, timeoutMs: number = checkTimeoutMs()): Date {
  return new Date(startedAt + FUNCTION_MAX_DURATION_S * 1000 - timeoutMs - RUN_OVERHEAD_MS - DISPATCH_RESERVE_MS);
}

/**
 * One scheduled run started over HTTP (QStash every 30 minutes): the
 * heartbeat, every check whose slot is due, then the alert outbox. Slot
 * claims make it safe to overlap with GitHub's fallback cron or a retry.
 */
export async function runScheduledTrigger(options: { startedAt: number; runId?: string }): Promise<TriggerSummary> {
  return Sentry.withMonitor(
    TRIGGER_MONITOR,
    async () => {
      const db = await getMongoDbClient().getDb();
      await recordHeartbeat(db, SCHEDULER_NAME, { runId: options.runId, mode: "scheduled" }).catch((error) =>
        logError("Could not record the scheduler heartbeat", { kind: errorKind(error) }),
      );
      const reports = await runChecks(
        { mode: "scheduled", now: new Date(options.startedAt), trigger: { kind: "schedule" }, startBy: startDeadline(options.startedAt) },
        { ...mongoRunChecksStore(db), run: runCheckNow },
      );
      await dispatchNow().catch((error) => logError("Dispatch after the scheduled trigger failed", { kind: errorKind(error) }));
      const summary = summarize(reports);
      // A check that threw (not one that found issues) fails the trigger, so Sentry marks the check-in failed.
      if (summary.failed > 0) throw new TriggerRunError(summary);
      return summary;
    },
    { schedule: { type: "crontab", value: "*/30 * * * *" }, checkinMargin: 15, maxRuntime: 6, timezone: "UTC" },
  );
}

export class TriggerRunError extends Error {
  constructor(readonly summary: TriggerSummary) {
    super(`${summary.failed} scheduled check(s) failed to run`);
    this.name = "TriggerRunError";
  }
}
