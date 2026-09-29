import type { RunOutcome } from "@/domain/run";

export type Language = "en" | "zh";
export type FindingValue = string | number | boolean | null;
export type FindingDetail = Record<string, FindingValue>;
/** Result rows, or a plain-text note when there is no table to show. */
export type RunRows = FindingDetail[] | string;

/** One run as returned by /api/execution-details/[resultId]. */
export interface ExecutionResult {
  _id: string;
  checkId: string;
  /** ISO time the run finished. */
  finishedAt: string;
  outcome: RunOutcome;
  /** Null on runs saved before the field existed. */
  rowCount?: number | null;
  error?: string | null;
  message: string;
  /** The runner's one-line summary. */
  findings: string;
  /** The sample rows the run kept. */
  sample: FindingDetail[];
  name?: string;
  cnName?: string;
  description?: string;
  cnDescription?: string;
  scope?: string;
  cnScope?: string;
  author?: string;
}

/**
 * Reads /api/execution-details: the run, null when there is no run with that
 * id (404, or 400 for a malformed id), or an Error with the API's message, or
 * the HTTP status when the body is not JSON (e.g. a proxy page).
 */
export async function readRunResponse(res: Response): Promise<ExecutionResult | null> {
  if (res.ok) return res.json();
  if (res.status === 404 || res.status === 400) return null;
  const body: { message?: string } | null = await res.json().catch(() => null);
  throw new Error(body?.message || `Error: ${res.status}`);
}

/** Findings as table rows, or null when the run returned no rows. */
export function tableRows(findings: RunRows): FindingDetail[] | null {
  return Array.isArray(findings) && findings.length > 0 ? findings : null;
}

export function rowCount(findings: RunRows): number | null {
  return Array.isArray(findings) ? findings.length : null;
}

/** One sentence that says what happened, before any detail. */
export function runHeadline(outcome: RunOutcome, rows: number | null, language: Language): string {
  const zh = language === "zh";
  if (outcome === "issues") {
    if (rows === null) return zh ? "发现需要关注的问题" : "Needs attention";
    return zh ? `${rows} 行需要关注` : `${rows} ${rows === 1 ? "row needs" : "rows need"} attention`;
  }
  if (outcome === "clean") return zh ? "正常：没有返回任何行" : "Clean: no rows returned";
  return zh ? "查询出错" : "The query failed";
}

/** The Chinese variant when the UI is in Chinese and one exists, otherwise the English one. */
export function localized(language: Language, en: string | undefined, zh: string | undefined): string | undefined {
  return language === "zh" ? zh || en : en;
}

/** Columns come from the first row, in the order the query returned them. */
export function findingColumns(rows: FindingDetail[]): string[] {
  return rows.length > 0 ? Object.keys(rows[0]) : [];
}

/** Columns whose non-null values are all numbers (pg returns numerics as strings); these are right-aligned. */
export function numericColumns(rows: FindingDetail[], columns: string[]): Set<string> {
  return new Set(
    columns.filter((column) =>
      rows.every((row) => {
        const value = row[column];
        return value === null || value === undefined || (value !== "" && !Number.isNaN(Number(value)));
      }),
    ),
  );
}

export function columnLabel(column: string): string {
  return column.replace(/_/g, " ");
}

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
const NUMERIC_LITERAL = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/**
 * Spreadsheets run cells starting with = + - @ (or a tab/CR) as formulas, so
 * query data could execute on the analyst's machine. Such text gets a leading
 * quote; plain numbers like "-12.5" are left alone.
 */
function neutralizeFormula(text: string): string {
  return FORMULA_TRIGGER.test(text) && !NUMERIC_LITERAL.test(text) ? `'${text}` : text;
}

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
  const text = typeof value === "string" || typeof value === "object" ? neutralizeFormula(raw) : raw;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildFindingsCsv(rows: FindingDetail[]): string {
  const columns = findingColumns(rows);
  return [columns.map(csvCell).join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join(
    "\n",
  );
}

export function csvFileName(scriptId: string, now: Date): string {
  return `${scriptId}_findings_${now.toISOString().slice(0, 10)}.csv`;
}
