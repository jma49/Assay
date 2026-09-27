import type { RunReportMessages } from "./messages";

export type Language = "en" | "zh";
export type FindingValue = string | number | boolean | null;
export type FindingDetail = Record<string, FindingValue>;

/** One run as returned by /api/execution-details/[resultId]. */
export interface ExecutionResult {
  scriptId: string;
  executedAt: string;
  status: string;
  /** Finer-grained status than `status`, when the runner recorded one. */
  statusType?: string;
  message: string;
  /** Result rows, or a plain-text note when the run returned no table. */
  findings: FindingDetail[] | string;
  _id: string;
  name?: string;
  cnName?: string;
  description?: string;
  cnDescription?: string;
  scope?: string;
  cnScope?: string;
  author?: string;
}

export type RunTone = "attention_needed" | "success" | "failure";

export function runTone(result: Pick<ExecutionResult, "status" | "statusType">): RunTone {
  if (result.statusType === "attention_needed") return "attention_needed";
  return result.status === "success" ? "success" : "failure";
}

export const TONE_TEXT_CLASS: Record<RunTone, string> = {
  attention_needed: "text-attention",
  success: "text-success",
  failure: "text-failure",
};

export function statusLabel(tone: RunTone, statusTexts: RunReportMessages["statusTexts"]): string {
  if (tone === "attention_needed") return statusTexts.attentionNeeded;
  return tone === "success" ? statusTexts.success : statusTexts.failure;
}

/** Findings as table rows, or null when the run returned no rows. */
export function tableRows(findings: ExecutionResult["findings"]): FindingDetail[] | null {
  return Array.isArray(findings) && findings.length > 0 ? findings : null;
}

export function rowCount(findings: ExecutionResult["findings"]): number | null {
  return Array.isArray(findings) ? findings.length : null;
}

/** One sentence that says what happened, before any detail. */
export function runHeadline(tone: RunTone, rows: number | null, language: Language): string {
  const zh = language === "zh";
  if (tone === "attention_needed") {
    if (rows === null) return zh ? "发现需要关注的问题" : "Needs attention";
    return zh ? `${rows} 行需要关注` : `${rows} ${rows === 1 ? "row needs" : "rows need"} attention`;
  }
  if (tone === "success") return zh ? "正常：没有返回任何行" : "Clean: no rows returned";
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

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildFindingsCsv(rows: FindingDetail[]): string {
  const columns = findingColumns(rows);
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\n");
}

export function csvFileName(scriptId: string, now: Date): string {
  return `${scriptId}_findings_${now.toISOString().slice(0, 10)}.csv`;
}
