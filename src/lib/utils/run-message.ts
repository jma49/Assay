import type { RunOutcome } from "@/domain/run";

/** The fields a run carries that say what it found; older runs may lack `rowCount` and `error`. */
export interface RunResultFields {
  outcome: RunOutcome;
  rowCount?: number | null;
  error?: string | null;
  /** Stored English summary, kept for older readers; used only to recover what newer fields lack. */
  message?: string | null;
  findings?: string | null;
}

const COPY = {
  en: { rows: (n: number) => (n === 1 ? "1 row" : `${n} rows`), noRows: "No rows", someRows: "Rows found", queryError: "Query error" },
  zh: { rows: (n: number) => `${n} 行`, noRows: "没有返回行", someRows: "返回了行", queryError: "查询出错" },
};

/**
 * Runs saved before commit 8cf3c3b read "Found Found N records". The
 * executor is fixed; this tidies those stored messages on display instead of
 * rewriting history in the database.
 */
export function cleanRunMessage(message: string | null | undefined): string {
  return (message ?? "").replace(/\bFound(\s+Found)+\b/g, "Found");
}

/** The row count of a run, from the field or, for runs saved before it existed, the stored summary. */
export function runRowCount(run: RunResultFields): number | null {
  if (typeof run.rowCount === "number") return run.rowCount;
  if (run.outcome === "clean") return 0;
  const found = /Found (\d+) records?/.exec(`${run.findings ?? ""} ${run.message ?? ""}`);
  return found ? Number(found[1]) : null;
}

/** The query's error text for a broken run; older runs kept it only in `message`. */
export function runErrorText(run: RunResultFields): string | null {
  if (run.outcome !== "error") return null;
  const text = (run.error ?? cleanRunMessage(run.message)).trim();
  return text || null;
}

/**
 * What a run found, in the reader's language: "3 rows", "No rows", or the
 * query's error. Built from the outcome and counts rather than the stored
 * English message, so every screen words it the same way.
 */
export function runResultLabel(run: RunResultFields, language: "en" | "zh"): string {
  const t = COPY[language];
  if (run.outcome === "error") return runErrorText(run) ?? t.queryError;
  const rows = runRowCount(run);
  if (rows === 0) return t.noRows;
  return rows === null ? t.someRows : t.rows(rows);
}
