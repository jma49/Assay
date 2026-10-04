import { randomUUID } from "node:crypto";
import type { Db } from "mongodb";
import { dueSlot } from "@/lib/scheduling/due-slot";
import { createSemaphore } from "@/server/concurrency/semaphore";
import type { RunCheckResult, RunTrigger } from "./run-check";
import { COLLECTIONS } from "@/lib/database/collections";
import { logError } from "@/lib/logging/log";

export type RunMode = "all" | "scheduled";

/**
 * How long a slot claim stays valid. Longer than the workflow's 20-minute
 * timeout, so a live run's claim never looks stale; a claim older than this
 * with no completed run means its trigger died mid-run.
 */
export const SLOT_CLAIM_LEASE_MS = 60 * 60 * 1000;

export interface CheckCandidate {
  scriptId: string;
  name: string;
  isScheduled: boolean;
  cronSchedule: string;
  lastScheduledRunSlot?: Date | null;
  /** The open claim on the check, if any: its slot and when it was taken. */
  slotClaim?: { slot: Date; at: Date } | null;
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
    let slot: Date | null = null;
    if (check.isScheduled && check.cronSchedule) {
      slot = dueSlot(check.cronSchedule, now, check.lastScheduledRunSlot ?? undefined);
      const claim = check.slotClaim;
      // A live claim on this slot means another trigger owns it right now.
      // A stale one means its trigger died mid-run; the slot stays due and
      // claimSlot reclaims it atomically.
      if (slot && claim && claim.slot.getTime() >= slot.getTime() && now.getTime() - claim.at.getTime() <= SLOT_CLAIM_LEASE_MS) {
        slot = null;
      }
    }
    if (slot) due.push({ check, slot });
    else notDue.push(check);
  }
  return { due, notDue };
}

export interface RunChecksDeps {
  listChecks(mode: RunMode): Promise<CheckCandidate[]>;
  /**
   * Takes the slot for this trigger; null when the slot already completed or
   * another trigger holds a live claim on it. A claim older than
   * SLOT_CLAIM_LEASE_MS is reclaimed: its trigger died before finishing.
   * Returns the claim id, which fences completeSlot and releaseSlot to this
   * trigger's own claim.
   */
  claimSlot(scriptId: string, slot: Date, now: Date): Promise<string | null>;
  /**
   * Marks the slot completed and clears this trigger's claim, so the slot is
   * never run again. Only touches the claim this trigger took, so a newer
   * claim is never disturbed.
   */
  completeSlot(scriptId: string, slot: Date, claim: string): Promise<void>;
  /**
   * Gives a claimed slot back after a run that did not happen, so the next
   * trigger retries it. Only releases this trigger's own claim.
   */
  releaseSlot(scriptId: string, claim: string): Promise<void>;
  run(scriptId: string, trigger: RunTrigger): Promise<RunCheckResult>;
}

export type CheckRunReport =
  | { scriptId: string; name: string; status: "ran"; result: RunCheckResult }
  | { scriptId: string; name: string; status: "not_due" | "claimed_elsewhere" | "would_run" | "deferred" }
  | { scriptId: string; name: string; status: "failed"; error: string };

/**
 * Runs many checks with bounded concurrency. Each slot is claimed before its
 * run, so overlapping triggers never run the same slot twice; the claim id
 * fences the completion and release to the trigger that took it. A claim
 * older than SLOT_CLAIM_LEASE_MS with no completed run is reclaimed, so a
 * trigger killed mid-run (e.g. the workflow's timeout) does not silently
 * drop its slot — while a completed slot is marked done and never runs
 * again. A run that found the check busy (another run holds its lease) or
 * threw gives the slot back, so the next trigger retries it within the
 * catch-up window. With `startBy`, a check whose turn comes after that time
 * is deferred unclaimed, so a trigger with a hard time limit (a serverless
 * function) leaves it to the next trigger instead of being killed mid-run.
 */
export async function runChecks(
  options: {
    mode: RunMode;
    now: Date;
    dryRun?: boolean;
    concurrency?: number;
    trigger: RunTrigger;
    startBy?: Date;
    clock?: () => number;
  },
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
        if (options.startBy && (options.clock ?? Date.now)() > options.startBy.getTime()) {
          return { ...base, status: "deferred" };
        }
        let claim: string | null = null;
        try {
          if (slot) {
            claim = await deps.claimSlot(check.scriptId, slot, options.now);
            if (!claim) return { ...base, status: "claimed_elsewhere" };
          }
          const result = await deps.run(check.scriptId, options.trigger);
          if (claim) {
            if (result.kind === "busy") await release(deps, check, claim);
            else await complete(deps, check, slot!, claim);
          }
          return { ...base, status: "ran", result };
        } catch (error) {
          if (claim) await release(deps, check, claim);
          return { ...base, status: "failed", error: error instanceof Error ? error.message : String(error) };
        }
      }),
    ),
  );
  return [...reports, ...ran];
}

async function release(deps: RunChecksDeps, check: CheckCandidate, claim: string): Promise<void> {
  try {
    await deps.releaseSlot(check.scriptId, claim);
  } catch (error) {
    // The slot stays taken: the same outcome as before releasing existed.
    logError(`[Scheduler] Could not release the slot of ${check.scriptId}`, { error });
  }
}

async function complete(deps: RunChecksDeps, check: CheckCandidate, slot: Date, claim: string): Promise<void> {
  try {
    await deps.completeSlot(check.scriptId, slot, claim);
  } catch (error) {
    // The run already finished and was recorded; the claim goes stale and a
    // later trigger re-runs the slot, which alert dedup keeps quiet.
    logError(`[Scheduler] Could not mark the slot of ${check.scriptId} completed`, { error });
  }
}

/** listChecks, claimSlot, completeSlot and releaseSlot over the checks collection. */
export function mongoRunChecksStore(db: Db): Pick<RunChecksDeps, "listChecks" | "claimSlot" | "completeSlot" | "releaseSlot"> {
  const checks = db.collection(COLLECTIONS.checks);
  return {
    async listChecks(mode) {
      const docs = await checks
        .find(mode === "scheduled" ? { isScheduled: true } : {}, {
          projection: { scriptId: 1, name: 1, isScheduled: 1, cronSchedule: 1, lastScheduledRunSlot: 1, lastSlotClaimSlot: 1, lastSlotClaimAt: 1 },
        })
        .sort({ createdAt: 1 })
        .toArray();
      return docs.map((doc) => ({
        scriptId: String(doc.scriptId),
        name: String(doc.name ?? doc.scriptId),
        isScheduled: Boolean(doc.isScheduled),
        cronSchedule: String(doc.cronSchedule ?? ""),
        lastScheduledRunSlot: doc.lastScheduledRunSlot ?? null,
        slotClaim:
          doc.lastSlotClaimAt && doc.lastSlotClaimSlot
            ? { slot: new Date(doc.lastSlotClaimSlot), at: new Date(doc.lastSlotClaimAt) }
            : null,
      }));
    },
    async claimSlot(scriptId, slot, now) {
      const claim = randomUUID();
      const staleBefore = new Date(now.getTime() - SLOT_CLAIM_LEASE_MS);
      const claimed = await checks.updateOne(
        {
          scriptId,
          $and: [
            // The slot never completed...
            { $or: [{ lastScheduledRunSlot: { $exists: false } }, { lastScheduledRunSlot: { $lt: slot } }] },
            // ...and no live claim on it stands in the way. A stale claim is
            // reclaimed: its trigger died before finishing.
            {
              $or: [
                { lastSlotClaimAt: { $exists: false } },
                { lastSlotClaimAt: { $lt: staleBefore } },
                { lastSlotClaimSlot: { $ne: slot } },
              ],
            },
          ],
        },
        { $set: { lastSlotClaimSlot: slot, lastSlotClaimAt: now, lastSlotClaim: claim } },
      );
      return claimed.modifiedCount > 0 ? claim : null;
    },
    async completeSlot(scriptId, slot, claim) {
      // Only this trigger's own claim, so a newer claim is never disturbed.
      await checks.updateOne(
        { scriptId, lastSlotClaim: claim },
        {
          $set: { lastScheduledRunSlot: slot },
          $unset: { lastSlotClaimSlot: "", lastSlotClaimAt: "", lastSlotClaim: "" },
        },
      );
    },
    async releaseSlot(scriptId, claim) {
      // Only this trigger's own claim, so a newer claim is never undone.
      await checks.updateOne(
        { scriptId, lastSlotClaim: claim },
        { $unset: { lastSlotClaimSlot: "", lastSlotClaimAt: "", lastSlotClaim: "" } },
      );
    },
  };
}
