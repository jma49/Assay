import type { RowDiff, RunOutcome } from "@/domain/run";

/**
 * What the checks list and detail pages receive. Dates are ISO strings,
 * since they cross the network as JSON.
 */
export interface CheckStateDto {
  outcome: RunOutcome;
  rowCount: number;
  previousRowCount: number | null;
  since: string;
  lastRunAt: string;
  lastRunId: string;
}

export interface RunPoint {
  outcome: RunOutcome;
  rowCount: number;
  at: string;
}

export interface CheckSummary {
  scriptId: string;
  name: string;
  cnName?: string;
  description?: string;
  cnDescription?: string;
  tags: string[];
  scope?: string;
  /** Cron in UTC, or null for manual checks. */
  schedule: string | null;
  state: CheckStateDto | null;
  /** Up to the last 30 runs, oldest first. */
  history: RunPoint[];
}

export interface RunListItem extends RunPoint {
  runId: string;
  trigger: string | null;
  diff: RowDiff | null;
  durationMs: number | null;
}

export type RowMark = "new" | "still" | null;

export interface LatestRun {
  runId: string;
  at: string;
  outcome: RunOutcome;
  rowCount: number;
  columns: string[];
  rows: { mark: RowMark; values: Record<string, unknown> }[];
  /** Rows the previous run returned that this one no longer does. */
  fixed: Record<string, unknown>[];
  /** Whether a previous run exists to compare against. */
  compared: boolean;
  message: string | null;
}

export interface CheckDetail extends CheckSummary {
  sql: string;
  author?: string;
  createdAt?: string;
  runs: RunListItem[];
  latest: LatestRun | null;
}
