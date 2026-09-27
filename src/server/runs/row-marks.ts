import type { RowMark } from "@/contracts/checks";
import { fingerprintRow } from "./fingerprint";

type Row = Record<string, unknown>;

/**
 * Marks each row of the latest run as new or still open against the
 * previous run, and returns the previous run's rows that are gone (fixed).
 * Fingerprints stored on a run are used when present; older runs get them
 * computed from their rows. Without a previous run nothing is marked.
 */
export function markRows(
  latest: { rows: Row[]; keys?: string[] | null },
  previous: { rows: Row[]; keys?: string[] | null } | null,
  fixedLimit = 50,
): { rows: { mark: RowMark; values: Row }[]; fixed: Row[] } {
  if (!previous) return { rows: latest.rows.map((values) => ({ mark: null, values })), fixed: [] };
  const latestKeys = new Set(latest.keys ?? latest.rows.map(fingerprintRow));
  const previousKeys = new Set(previous.keys ?? previous.rows.map(fingerprintRow));
  return {
    rows: latest.rows.map((values) => ({ mark: previousKeys.has(fingerprintRow(values)) ? "still" : "new", values })),
    fixed: previous.rows.filter((row) => !latestKeys.has(fingerprintRow(row))).slice(0, fixedLimit),
  };
}
