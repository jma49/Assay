/**
 * Pure rules about runs and check state, shared by server and browser.
 *
 * What a run of a check found. A check is a query whose rows need attention:
 * - error: the query itself failed, so the check needs fixing;
 * - issues: it returned rows;
 * - clean: it returned none.
 */
export type RunOutcome = "error" | "issues" | "clean";

/** Stored runs still carry the older names; these map both ways. */
export type LegacyStatusType = "failure" | "attention_needed" | "success";

const TO_LEGACY: Record<RunOutcome, LegacyStatusType> = {
  error: "failure",
  issues: "attention_needed",
  clean: "success",
};

export const toLegacyStatus = (outcome: RunOutcome): LegacyStatusType => TO_LEGACY[outcome];

export function fromLegacyStatus(status: string | undefined): RunOutcome {
  if (status === "failure") return "error";
  if (status === "attention_needed") return "issues";
  return "clean";
}

/** Rows kept on a run for display and export. */
export const SAMPLE_ROWS = 500;
/** Rows fingerprinted to tell new, still-open and fixed rows apart between runs. */
export const FINGERPRINT_ROWS = 5_000;

/** A JSON-safe copy of a database row: bigints become strings, dates ISO strings. */
export function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = typeof value === "bigint" ? value.toString() : value instanceof Date ? value.toISOString() : value;
  }
  return out;
}

export interface RowDiff {
  /** In this run but not the previous one. */
  added: number;
  /** In both runs. */
  still: number;
  /** In the previous run but gone now. */
  fixed: number;
}

export function diffRowKeys(previous: readonly string[], current: readonly string[]): RowDiff {
  const before = new Set(previous);
  const now = new Set(current);
  let still = 0;
  for (const key of now) if (before.has(key)) still++;
  return { added: now.size - still, still, fixed: before.size - still };
}

/** The check's state after a run: what the list page and alerts read. */
export interface CheckState {
  outcome: RunOutcome;
  rowCount: number;
  previousRowCount: number | null;
  /** When the check entered its current outcome. */
  since: Date;
  lastRunId: string;
  lastRunAt: Date;
}

export interface RunSummary {
  runId: string;
  outcome: RunOutcome;
  rowCount: number;
  finishedAt: Date;
}

export function nextCheckState(previous: CheckState | null | undefined, run: RunSummary): CheckState {
  const changed = !previous || previous.outcome !== run.outcome;
  return {
    outcome: run.outcome,
    rowCount: run.rowCount,
    previousRowCount: previous ? previous.rowCount : null,
    since: changed ? run.finishedAt : previous.since,
    lastRunId: run.runId,
    lastRunAt: run.finishedAt,
  };
}

/**
 * Whether a run is worth an event (activity feed, notifications): the
 * outcome changed, or the same outcome now has rows it did not have before.
 */
export function isNotable(previous: CheckState | null | undefined, outcome: RunOutcome, diff: RowDiff | null): boolean {
  if (!previous) return outcome !== "clean";
  if (previous.outcome !== outcome) return true;
  return outcome === "issues" && !!diff && diff.added > 0;
}
