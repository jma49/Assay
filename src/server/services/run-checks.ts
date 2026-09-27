import type { Db } from "mongodb";
import { dueSlot } from "@/lib/scheduling/due-slot";
import { createSemaphore } from "@/server/concurrency/semaphore";
import type { RunCheckResult, RunTrigger } from "./run-check";

export type RunMode = "all" | "scheduled";

export interface CheckCandidate {
  scriptId: string;
  name: string;
  isScheduled: boolean;
  cronSchedule: string;
  lastScheduledRunSlot?: Date | null;
}

export interface PlannedRun {
  check: CheckCandidate;
  /** The cron slot a scheduled run is for; null for "all". */
  slot: Date | null;
}

/**
 * Which checks to run now. "all" runs every check; "scheduled" runs each
 * scheduled check once per cron slot (see dueSlot), skipping the rest.
 */
export function planRuns(checks: CheckCandidate[], mode: RunMode, now: Date): { due: PlannedRun[]; notDue: CheckCandidate[] } {
  if (mode === "all") return { due: checks.map((check) => ({ check, slot: null })), notDue: [] };
  const due: PlannedRun[] = [];
  const notDue: CheckCandidate[] = [];
  for (const check of checks) {
    const slot = check.isScheduled && check.cronSchedule ? dueSlot(check.cronSchedule, now, check.lastScheduledRunSlot ?? undefined) : null;
    if (slot) due.push({ check, slot });
    else notDue.push(check);
  }
  return { due, notDue };
}

export interface RunChecksDeps {
  listChecks(mode: RunMode): Promise<CheckCandidate[]>;
  /** Records that the slot is taken; false when another trigger already ran it. */
  claimSlot(scriptId: string, slot: Date): Promise<boolean>;
  /**
   * Gives a claimed slot back after a run that did not happen, so the next
   * trigger retries it. `previous` is the slot the check last ran for.
   */
  releaseSlot(scriptId: string, slot: Date, previous: Date | null): Promise<void>;
  run(scriptId: string, trigger: RunTrigger): Promise<RunCheckResult>;
}

export type CheckRunReport =
  | { scriptId: string; name: string; status: "ran"; result: RunCheckResult }
  | { scriptId: string; name: string; status: "not_due" | "claimed_elsewhere" | "would_run" }
  | { scriptId: string; name: string; status: "failed"; error: string };

/**
 * Runs many checks with bounded concurrency. Each slot is claimed before
 * its run, so overlapping triggers never run the same slot twice. A run
 * that found the check busy (another run holds its lease) or threw gives
 * the slot back, so the next trigger retries it within the catch-up window.
 */
export async function runChecks(
  options: { mode: RunMode; now: Date; dryRun?: boolean; concurrency?: number; trigger: RunTrigger },
  deps: RunChecksDeps,
): Promise<CheckRunReport[]> {
  const checks = await deps.listChecks(options.mode);
  const { due, notDue } = planRuns(checks, options.mode, options.now);
  const reports: CheckRunReport[] = notDue.map((c) => ({ scriptId: c.scriptId, name: c.name, status: "not_due" }));

  if (options.dryRun) {
    return [...reports, ...due.map(({ check }) => ({ scriptId: check.scriptId, name: check.name, status: "would_run" as const }))];
  }

  const limit = createSemaphore(Math.max(1, options.concurrency ?? 3));
  const ran = await Promise.all(
    due.map(({ check, slot }) =>
      limit.run(async (): Promise<CheckRunReport> => {
        const base = { scriptId: check.scriptId, name: check.name };
        let claimed = false;
        try {
          if (slot) {
            if (!(await deps.claimSlot(check.scriptId, slot))) return { ...base, status: "claimed_elsewhere" };
            claimed = true;
          }
          const result = await deps.run(check.scriptId, options.trigger);
          if (claimed && result.kind === "busy") await release(deps, check, slot!);
          return { ...base, status: "ran", result };
        } catch (error) {
          if (claimed) await release(deps, check, slot!);
          return { ...base, status: "failed", error: error instanceof Error ? error.message : String(error) };
        }
      }),
    ),
  );
  return [...reports, ...ran];
}

async function release(deps: RunChecksDeps, check: CheckCandidate, slot: Date): Promise<void> {
  try {
    await deps.releaseSlot(check.scriptId, slot, check.lastScheduledRunSlot ?? null);
  } catch (error) {
    // The slot stays taken: the same outcome as before releasing existed.
    console.error(`[Scheduler] Could not release the slot of ${check.scriptId}:`, error);
  }
}

/** listChecks, claimSlot and releaseSlot over the sql_scripts collection. */
export function mongoRunChecksStore(db: Db): Pick<RunChecksDeps, "listChecks" | "claimSlot" | "releaseSlot"> {
  const checks = db.collection("sql_scripts");
  return {
    async listChecks(mode) {
      const docs = await checks
        .find(mode === "scheduled" ? { isScheduled: true } : {}, {
          projection: { scriptId: 1, name: 1, isScheduled: 1, cronSchedule: 1, lastScheduledRunSlot: 1 },
        })
        .sort({ createdAt: 1 })
        .toArray();
      return docs.map((doc) => ({
        scriptId: String(doc.scriptId),
        name: String(doc.name ?? doc.scriptId),
        isScheduled: Boolean(doc.isScheduled),
        cronSchedule: String(doc.cronSchedule ?? ""),
        lastScheduledRunSlot: doc.lastScheduledRunSlot ?? null,
      }));
    },
    async claimSlot(scriptId, slot) {
      const claimed = await checks.updateOne(
        { scriptId, $or: [{ lastScheduledRunSlot: { $exists: false } }, { lastScheduledRunSlot: { $lt: slot } }] },
        { $set: { lastScheduledRunSlot: slot } },
      );
      return claimed.modifiedCount > 0;
    },
    async releaseSlot(scriptId, slot, previous) {
      // Only while the slot is still ours, so a newer claim is never undone.
      await checks.updateOne(
        { scriptId, lastScheduledRunSlot: slot },
        previous ? { $set: { lastScheduledRunSlot: previous } } : { $unset: { lastScheduledRunSlot: "" } },
      );
    },
  };
}
