import { ObjectId, type Db, type Document } from "mongodb";
import { DEFAULT_WORKSPACE_ID } from "@/domain/workspace";
import { runExpiresAt, runRetentionDays, stateFromHistory } from "@/domain/run";
import { type CheckEvent, type RunCheckStore, type RunDocument } from "@/server/services/run-check";
import { COLLECTIONS } from "@/lib/database/collections";

// Enough runs to find when the current streak began for any realistic schedule.
const HISTORY_LIMIT = 500;

const DUPLICATE_KEY = 11000;

/**
 * runCheck's state in MongoDB. The lease lives on the check document so
 * taking it is one atomic findOneAndUpdate.
 */
export function mongoRunCheckStore(db: Db): RunCheckStore {
  const checks = db.collection(COLLECTIONS.checks);
  const runs = db.collection(COLLECTIONS.runs);

  return {
    async acquireLease(scriptId, runId, until, now) {
      const check = await checks.findOneAndUpdate(
        // `lease: null` also matches documents without a lease.
        { scriptId, $or: [{ lease: null }, { "lease.until": { $lte: now } }] },
        { $set: { lease: { runId, until } } },
        { returnDocument: "after", projection: { scriptId: 1, sqlContent: 1, state: 1, createdAt: 1, pendingEvents: 1 } },
      );
      if (check) {
        return {
          kind: "acquired",
          check: {
            scriptId,
            sqlContent: String(check.sqlContent ?? ""),
            state: check.state ?? null,
            createdAt: check.createdAt instanceof Date ? check.createdAt : null,
            pendingEvents: Array.isArray(check.pendingEvents) ? (check.pendingEvents as CheckEvent[]) : [],
          },
        };
      }
      const existing = await checks.findOne({ scriptId }, { projection: { lease: 1 } });
      if (!existing) return { kind: "missing" };
      return { kind: "busy", runId: String(existing.lease?.runId ?? "") };
    },

    async previousRowKeys(runId) {
      if (!ObjectId.isValid(runId)) return null;
      const run = await runs.findOne({ _id: new ObjectId(runId) }, { projection: { rowKeys: 1 } });
      return Array.isArray(run?.rowKeys) ? (run.rowKeys as string[]) : null;
    },

    async historicalState(scriptId, notBefore) {
      const history = await runs
        .find(
          { checkId: scriptId, ...(notBefore && { finishedAt: { $gte: notBefore } }) },
          { projection: { outcome: 1, rowCount: 1, finishedAt: 1 } },
        )
        .sort({ finishedAt: -1 })
        .limit(HISTORY_LIMIT)
        .toArray();
      return stateFromHistory(
        history.map((run) => ({
          runId: run._id.toString(),
          outcome: run.outcome,
          rowCount: Number(run.rowCount ?? 0),
          finishedAt: new Date(run.finishedAt),
        })),
      );
    },

    async saveRun(run: RunDocument) {
      const doc: Document = {
        _id: new ObjectId(run.runId),
        checkId: run.checkId,
        trigger: run.trigger,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        durationMs: run.durationMs,
        outcome: run.outcome,
        rowCount: run.rowCount,
        columns: run.columns,
        rowKeys: run.rowKeys,
        diff: run.diff,
        error: run.error,
        message: run.message,
        findings: run.findings,
        sample: run.sample,
        github_run_id: process.env.GITHUB_RUN_ID,
      };
      // Deleted by the TTL index on expiresAt; runs without it are kept.
      const expiresAt = runExpiresAt(run.finishedAt, runRetentionDays());
      if (expiresAt) doc.expiresAt = expiresAt;
      await runs.insertOne(doc);
    },

    async commitState(scriptId, runId, state, event) {
      // One document, one update: the state and its not-yet-written event land together.
      const result = await checks.updateOne(
        { scriptId, "lease.runId": runId },
        { $set: { state }, $unset: { lease: "" }, ...(event && { $push: { pendingEvents: event } }) } as Document,
      );
      return result.matchedCount > 0;
    },

    async renewLease(scriptId, runId, until) {
      const result = await checks.updateOne({ scriptId, "lease.runId": runId }, { $set: { "lease.until": until } });
      return result.matchedCount > 0;
    },

    async releaseLease(scriptId, runId) {
      await checks.updateOne({ scriptId, "lease.runId": runId }, { $unset: { lease: "" } });
    },

    async recordEvent(event: CheckEvent) {
      await insertEvent(db, event);
    },
  };
}

/** Writes an event (a duplicate means another writer got there first), then clears it from the check. */
async function insertEvent(db: Db, event: CheckEvent): Promise<void> {
  try {
    await db.collection(COLLECTIONS.events).insertOne({ ...event, workspaceId: DEFAULT_WORKSPACE_ID });
  } catch (error) {
    if ((error as { code?: number }).code !== DUPLICATE_KEY) throw error;
  }
  await db.collection(COLLECTIONS.checks).updateOne({ scriptId: event.checkId }, { $pull: { pendingEvents: { runId: event.runId } } } as Document);
}

/**
 * Writes the events runs committed but never wrote (their process died
 * between the two steps). The dispatcher calls it before fanning out, so an
 * alert is at most one dispatch late. Safe to run concurrently with runs and
 * other dispatchers: events are unique per run.
 */
export async function repairPendingEvents(db: Db, limit = 100): Promise<number> {
  const stranded = await db
    .collection(COLLECTIONS.checks)
    .find({ "pendingEvents.0": { $exists: true } }, { projection: { pendingEvents: 1 } })
    .limit(limit)
    .toArray();
  let written = 0;
  for (const check of stranded) {
    for (const event of check.pendingEvents as CheckEvent[]) {
      await insertEvent(db, event);
      written++;
    }
  }
  return written;
}
