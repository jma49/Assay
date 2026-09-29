/**
 * Pure rules about runs and check state, shared by server and browser.
 *
 * What a run of a check found. A check is a query whose rows need attention:
 * - error: the query itself failed, so the check needs fixing;
 * - issues: it returned rows;
 * - clean: it returned none.
 */
export type RunOutcome = "error" | "issues" | "clean";

/** Rows kept on a run for display and export. */
const SAMPLE_ROWS = 500;
/** Rows fingerprinted to tell new, still-open and fixed rows apart between runs. */
export const FINGERPRINT_ROWS = 5_000;
/**
 * UTF-8 bytes of sample rows kept on a run, and the most a response carries
 * per sample. A check's page sends two samples (the latest run and the one
 * before, to mark new rows), so 1 MB each keeps it well under Vercel's
 * 4.5 MB response limit.
 */
export const SAMPLE_BYTES = 1024 * 1024;

const utf8 = new TextEncoder();

/** Bytes a value takes as UTF-8 JSON (string length would count UTF-16 units, undercounting non-ASCII text up to 3x). */
export function jsonBytes(value: unknown): number {
  return utf8.encode(JSON.stringify(value) ?? "").length;
}

/**
 * The rows kept for display: at most SAMPLE_ROWS, and fewer when they are
 * wide, so a run document and any response carrying it stay small. The row
 * count is kept separately.
 */
export function sampleRows(rows: readonly Record<string, unknown>[], maxRows = SAMPLE_ROWS, maxBytes = SAMPLE_BYTES): Record<string, unknown>[] {
  const kept: Record<string, unknown>[] = [];
  let bytes = 2; // the array's brackets
  for (const row of rows.slice(0, maxRows)) {
    bytes += jsonBytes(row) + 1; // and its comma
    if (bytes > maxBytes) break;
    kept.push(row);
  }
  return kept;
}

/** Days a run is kept (RUN_RETENTION_DAYS, 90 by default, also when empty); 0 keeps runs forever. */
export function runRetentionDays(env: Record<string, string | undefined> = process.env): number {
  const raw = env.RUN_RETENTION_DAYS?.trim();
  if (!raw) return 90;
  const days = Number(raw);
  return Number.isFinite(days) && days >= 0 ? days : 90;
}

/** When a run finished at `finishedAt` may be deleted, or null to keep it. */
export function runExpiresAt(finishedAt: Date, days: number): Date | null {
  return days > 0 ? new Date(finishedAt.getTime() + days * 86_400_000) : null;
}

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

export interface HistoricalRun {
  runId: string;
  outcome: RunOutcome;
  rowCount: number;
  finishedAt: Date;
}

/**
 * A check's state rebuilt from its past runs, newest first: the latest
 * outcome, when that streak began, and the row count before the latest run.
 * Used to back-fill checks that ran before state was kept.
 */
export function stateFromHistory(runsNewestFirst: readonly HistoricalRun[]): CheckState | null {
  const [latest, ...older] = runsNewestFirst;
  if (!latest) return null;
  let since = latest.finishedAt;
  for (const run of older) {
    if (run.outcome !== latest.outcome) break;
    since = run.finishedAt;
  }
  return {
    outcome: latest.outcome,
    rowCount: latest.rowCount,
    previousRowCount: older[0]?.rowCount ?? null,
    since,
    lastRunId: latest.runId,
    lastRunAt: latest.finishedAt,
  };
}
