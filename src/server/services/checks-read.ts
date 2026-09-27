import { ObjectId, type Db, type Document } from "mongodb";
import type { CheckDetail, CheckStateDto, CheckSummary, LatestRun, RunListItem, RunPoint } from "@/contracts/checks";
import { fromLegacyStatus, stateFromHistory, type CheckState, type RunOutcome } from "@/domain/run";
import { markRows } from "@/server/runs/row-marks";
import { toAlertingDto } from "./alert-controls";

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

/** A stored run, old or new shape, as the pages need it. */
export function runPoint(run: Document): RunPoint & { runId: string } {
  const outcome: RunOutcome = run.outcome ?? fromLegacyStatus(run.statusType);
  const rowCount =
    typeof run.rowCount === "number"
      ? run.rowCount
      : typeof run.legacyRowCount === "number"
        ? run.legacyRowCount
        : Array.isArray(run.raw_results)
          ? run.raw_results.length
          : 0;
  return { runId: String(run._id), outcome, rowCount, at: new Date(run.finishedAt ?? run.execution_time).toISOString() };
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
 * The last runs of every listed check in one query: runs are narrowed to
 * the fields the list needs before a window function ranks them per check,
 * so no stored rows are ever loaded.
 */
async function recentRuns(db: Db, scriptIds: string[], limit: number) {
  const docs = await db
    .collection("result")
    .aggregate([
      { $match: { script_name: { $in: scriptIds } } },
      {
        $project: {
          script_name: 1,
          execution_time: 1,
          finishedAt: 1,
          statusType: 1,
          outcome: 1,
          rowCount: 1,
          trigger: 1,
          diff: 1,
          durationMs: 1,
          legacyRowCount: { $size: { $ifNull: ["$raw_results", []] } },
        },
      },
      {
        $setWindowFields: {
          partitionBy: "$script_name",
          sortBy: { execution_time: -1 },
          output: { rank: { $documentNumber: {} } },
        },
      },
      { $match: { rank: { $lte: limit } } },
      { $sort: { script_name: 1, execution_time: -1 } },
    ])
    .toArray();
  const byCheck = new Map<string, Document[]>();
  for (const doc of docs) {
    const list = byCheck.get(doc.script_name) ?? [];
    list.push(doc);
    byCheck.set(doc.script_name, list);
  }
  return byCheck;
}

export async function listChecks(db: Db): Promise<CheckSummary[]> {
  const checks = await db.collection("sql_scripts").find({}, { projection: CHECK_FIELDS }).sort({ name: 1 }).toArray();
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
  return db.collection("result").findOne(
    { _id: new ObjectId(runId) },
    { projection: { raw_results: 1, rowKeys: 1, columns: 1, message: 1, error: 1 } },
  );
}

export async function getCheckDetail(db: Db, scriptId: string): Promise<CheckDetail | null> {
  const check = await db
    .collection("sql_scripts")
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
    const latestRows: Record<string, unknown>[] = Array.isArray(latestDoc?.raw_results) ? latestDoc.raw_results : [];
    const marked = markRows(
      { rows: latestRows, keys: latestDoc?.rowKeys ?? null },
      previousDoc ? { rows: Array.isArray(previousDoc.raw_results) ? previousDoc.raw_results : [], keys: previousDoc.rowKeys ?? null } : null,
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
