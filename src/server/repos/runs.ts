import { ObjectId, type Db, type Document } from "mongodb";
import type { CheckStats } from "@/contracts/runs";
import { COLLECTIONS } from "@/lib/database/collections";
import { cappedCount, type CappedCount } from "@/server/http/paging";

/**
 * Reads of stored runs. Only run-check-store.ts writes a run; the one other
 * write here is the AI triage cached on it.
 */

type Projection = Record<string, unknown>;

const runs = (db: Db) => db.collection(COLLECTIONS.runs);

/** One run by id, or null when there is none or the id is not an ObjectId. */
export async function findRun(db: Db, runId: string, projection: Projection): Promise<Document | null> {
  if (!ObjectId.isValid(runId)) return null;
  return runs(db).findOne({ _id: new ObjectId(runId) }, { projection });
}

/** A check's latest runs, newest first, on the (checkId, finishedAt) index. */
export async function latestRunsOf(db: Db, checkId: string, limit: number, projection: Projection): Promise<Document[]> {
  return runs(db).find({ checkId }, { projection }).sort({ finishedAt: -1 }).limit(limit).toArray();
}

export interface RunPage {
  filter: Record<string, unknown>;
  sort: Record<string, 1 | -1>;
  page: number;
  limit: number;
  projection: Projection;
}

/** One page of the runs matching `filter`, in `sort` order. */
export async function listRuns(db: Db, { filter, sort, page, limit, projection }: RunPage): Promise<Document[]> {
  return runs(db)
    .find(filter, { projection })
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();
}

/** One page of runs through an aggregation, for orders a plain sort cannot express (by check name). */
export async function aggregateRuns(db: Db, pipeline: Document[]): Promise<Document[]> {
  return runs(db).aggregate(pipeline).toArray();
}

/** How many runs match, up to COUNT_CAP. */
export async function countRuns(db: Db, filter: Record<string, unknown>): Promise<CappedCount> {
  return cappedCount(runs(db), filter);
}

/**
 * Runs counted by outcome: clean (success), issues (needs attention) and
 * error (failure). Three counts on the (outcome, finishedAt) index read no
 * run documents, where a $group would load every stored run and its sample.
 */
export async function countRunsByOutcome(db: Db): Promise<CheckStats> {
  const [successCount, needsAttentionCount, failureCount] = await Promise.all(
    (["clean", "issues", "error"] as const).map((outcome) => runs(db).countDocuments({ outcome })),
  );
  return { totalCount: successCount + needsAttentionCount + failureCount, successCount, failureCount, needsAttentionCount };
}

/** Keeps an AI triage on the run, one per language, so the next reader gets it without a model call. */
export async function saveTriage(db: Db, runId: ObjectId, language: "en" | "zh", triage: Document): Promise<void> {
  await runs(db).updateOne({ _id: runId }, { $set: { [`aiTriage.${language}`]: triage } });
}
