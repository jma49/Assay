import { ObjectId, type Db, type Document } from "mongodb";
import { DEFAULT_WORKSPACE_ID } from "@/domain/workspace";
import { fromLegacyStatus, stateFromHistory } from "@/domain/run";
import { legacyRunFields, type CheckEvent, type RunCheckStore, type RunDocument } from "@/server/services/run-check";

// Enough runs to find when the current streak began for any realistic schedule.
const HISTORY_LIMIT = 500;

const DUPLICATE_KEY = 11000;

/**
 * runCheck's state in MongoDB. The lease lives on the check document so
 * taking it is one atomic findOneAndUpdate; runs keep the fields older
 * pages read (script_name, raw_results, ...) next to the new ones.
 */
export function mongoRunCheckStore(db: Db): RunCheckStore {
  const checks = db.collection("sql_scripts");
  const runs = db.collection("result");
  const events = db.collection("events");

  return {
    async acquireLease(scriptId, runId, until, now) {
      const check = await checks.findOneAndUpdate(
        // `lease: null` also matches documents without a lease.
        { scriptId, $or: [{ lease: null }, { "lease.until": { $lte: now } }] },
        { $set: { lease: { runId, until } } },
        { returnDocument: "after", projection: { scriptId: 1, sqlContent: 1, state: 1 } },
      );
      if (check) {
        return { kind: "acquired", check: { scriptId, sqlContent: String(check.sqlContent ?? ""), state: check.state ?? null } };
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

    async historicalState(scriptId) {
      const history = await runs
        .find(
          { script_name: scriptId },
          { projection: { outcome: 1, statusType: 1, rowCount: 1, execution_time: 1, legacyRowCount: { $size: { $ifNull: ["$raw_results", []] } } } },
        )
        .sort({ execution_time: -1 })
        .limit(HISTORY_LIMIT)
        .toArray();
      return stateFromHistory(
        history.map((run) => ({
          runId: run._id.toString(),
          outcome: run.outcome ?? fromLegacyStatus(run.statusType),
          rowCount: typeof run.rowCount === "number" ? run.rowCount : Number(run.legacyRowCount ?? 0),
          finishedAt: new Date(run.execution_time),
        })),
      );
    },

    async saveRun(run: RunDocument) {
      const doc: Document = {
        _id: new ObjectId(run.runId),
        ...legacyRunFields(run, process.env.GITHUB_RUN_ID),
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
      };
      await runs.insertOne(doc);
    },

    async commitState(scriptId, runId, state) {
      const result = await checks.updateOne({ scriptId, "lease.runId": runId }, { $set: { state }, $unset: { lease: "" } });
      return result.matchedCount > 0;
    },

    async releaseLease(scriptId, runId) {
      await checks.updateOne({ scriptId, "lease.runId": runId }, { $unset: { lease: "" } });
    },

    async recordEvent(event: CheckEvent) {
      try {
        await events.insertOne({ ...event, workspaceId: DEFAULT_WORKSPACE_ID });
      } catch (error) {
        if ((error as { code?: number }).code !== DUPLICATE_KEY) throw error;
      }
    },
  };
}
