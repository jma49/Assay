import { ObjectId, type Db, type Document } from "mongodb";
import type { CheckDetail, CheckStateDto, CheckSummary, LatestRun, RunListItem, RunPoint } from "@/contracts/checks";
import { stateFromHistory, type CheckState, type RunOutcome } from "@/domain/run";
import { markRows } from "@/server/runs/row-marks";
import { responseSample, SAMPLE_FIELDS } from "@/server/runs/sample";
import { toAlertingDto } from "./alert-controls";
import { COLLECTIONS } from "@/lib/database/collections";

export const HISTORY_LENGTH = 30;

const CHECK_FIELDS = {
  _id: 0,
  scriptId: 1,
  name: 1,
  cnName: 1,
  description: 1,
  cnDescription: 1,
  hashtags: 1,
  scope: 1,
  isScheduled: 1,
  cronSchedule: 1,
  state: 1,
  alerting: 1,
} as const;

/** A stored run as the pages need it (older runs got these fields from migrations/backfill-run-fields.ts). */
export function runPoint(run: Document): RunPoint & { runId: string } {
  const outcome: RunOutcome = run.outcome ?? "clean";
  const rowCount = typeof run.rowCount === "number" ? run.rowCount : 0;
  return { runId: String(run._id), outcome, rowCount, at: new Date(run.finishedAt).toISOString() };
}

function stateDto(state: CheckState | null | undefined): CheckStateDto | null {
  if (!state) return null;
  return {
    outcome: state.outcome,
    rowCount: state.rowCount,
    previousRowCount: state.previousRowCount,
    since: new Date(state.since).toISOString(),
    lastRunAt: new Date(state.lastRunAt).toISOString(),
    lastRunId: String(state.lastRunId),
  };
}

/** The list item for a check; checks that predate stored state get it from their history. */
export function toSummary(check: Document, historyNewestFirst: (RunPoint & { runId: string })[]): CheckSummary {
  const state =
    stateDto(check.state) ??
    stateDto(
      stateFromHistory(historyNewestFirst.map((run) => ({ ...run, finishedAt: new Date(run.at) }))),
    );
  return {
    scriptId: String(check.scriptId),
    name: String(check.name ?? check.scriptId),
    cnName: check.cnName || undefined,
    description: check.description || undefined,
    cnDescription: check.cnDescription || undefined,
    tags: Array.isArray(check.hashtags) ? check.hashtags : [],
    scope: check.scope || undefined,
    schedule: check.isScheduled && check.cronSchedule ? String(check.cronSchedule) : null,
    state,
    alerting: toAlertingDto(check.alerting, state ? { since: new Date(state.since), outcome: state.outcome } : null),
    history: historyNewestFirst
      .slice(0, HISTORY_LENGTH)
      .reverse()
      .map(({ outcome, rowCount, at }) => ({ outcome, rowCount, at })),
  };
}

/**
 * The last runs of every listed check: one query per check on the
 * (checkId, finishedAt) index, each reading at most `limit` runs. A single
 * aggregation over all checks would rank every retained run on each load.
 */
async function recentRuns(db: Db, scriptIds: string[], limit: number) {
  const runs = db.collection(COLLECTIONS.runs);
  const lists = await Promise.all(
    scriptIds.map((checkId) =>
      runs
        .find({ checkId }, { projection: { checkId: 1, finishedAt: 1, outcome: 1, rowCount: 1, trigger: 1, diff: 1, durationMs: 1 } })
        .sort({ finishedAt: -1 })
        .limit(limit)
        .toArray(),
    ),
  );
  return new Map<string, Document[]>(scriptIds.map((checkId, index) => [checkId, lists[index]]));
}

export async function listChecks(db: Db): Promise<CheckSummary[]> {
  const checks = await db.collection(COLLECTIONS.checks).find({}, { projection: CHECK_FIELDS }).sort({ name: 1 }).toArray();
  const runs = await recentRuns(
    db,
    checks.map((c) => String(c.scriptId)),
    HISTORY_LENGTH,
  );
  return checks.map((check) => toSummary(check, (runs.get(String(check.scriptId)) ?? []).map(runPoint)));
}

function toRunItem(run: Document): RunListItem {
  const { runId, ...point } = runPoint(run);
  return {
    ...point,
    runId,
    trigger: typeof run.trigger?.kind === "string" ? run.trigger.kind : null,
    diff: run.diff ?? null,
    durationMs: typeof run.durationMs === "number" ? run.durationMs : null,
  };
}

async function loadRows(db: Db, runId: string) {
  return db.collection(COLLECTIONS.runs).findOne(
    { _id: new ObjectId(runId) },
    { projection: { ...SAMPLE_FIELDS, rowKeys: 1, columns: 1, message: 1, error: 1 } },
  );
}

export async function getCheckDetail(db: Db, scriptId: string): Promise<CheckDetail | null> {
  const check = await db
    .collection(COLLECTIONS.checks)
    .findOne({ scriptId }, { projection: { ...CHECK_FIELDS, sqlContent: 1, author: 1, createdAt: 1 } });
  if (!check) return null;

  const history = (await recentRuns(db, [scriptId], HISTORY_LENGTH)).get(scriptId) ?? [];
  const summary = toSummary(check, history.map(runPoint));

  let latest: LatestRun | null = null;
  if (history[0]) {
    const [latestDoc, previousDoc] = await Promise.all([
      loadRows(db, String(history[0]._id)),
      history[1] ? loadRows(db, String(history[1]._id)) : Promise.resolve(null),
    ]);
    const latestRows = responseSample(latestDoc);
    const marked = markRows(
      { rows: latestRows, keys: latestDoc?.rowKeys ?? null },
      previousDoc ? { rows: responseSample(previousDoc), keys: previousDoc.rowKeys ?? null } : null,
    );
    const point = runPoint(history[0]);
    latest = {
      runId: point.runId,
      at: point.at,
      outcome: point.outcome,
      rowCount: point.rowCount,
      columns: latestDoc?.columns ?? (latestRows[0] ? Object.keys(latestRows[0]) : []),
      rows: marked.rows,
      fixed: marked.fixed,
      compared: Boolean(previousDoc),
      message: latestDoc?.error ?? latestDoc?.message ?? null,
    };
  }

  return {
    ...summary,
    sql: String(check.sqlContent ?? ""),
    author: check.author || undefined,
    createdAt: check.createdAt ? new Date(check.createdAt).toISOString() : undefined,
    runs: history.map(toRunItem),
    latest,
  };
}
