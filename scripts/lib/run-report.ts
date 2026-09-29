import type { RunCheckResult } from "@/server/services/run-check";
import type { CheckRunReport } from "@/server/services/run-checks";

/**
 * One line per check for the command line. In a public CI log a check shows
 * only its id, outcome and row count: a run's message and a failure's text
 * can quote data values or connection details, and both stay in the app.
 */
export function reportLine(report: CheckRunReport, publicLog: boolean): string {
  return `- ${report.scriptId}: ${reportDetail(report, publicLog)}`;
}

function reportDetail(report: CheckRunReport, publicLog: boolean): string {
  if (report.status === "ran") return resultDetail(report.result, publicLog);
  if (report.status === "failed") return publicLog ? "failed (details in the app and its server logs)" : `failed: ${report.error}`;
  return report.status.replace("_", " ");
}

export function resultDetail(result: RunCheckResult, publicLog: boolean): string {
  if (result.kind === "busy") return "already running";
  if (result.kind === "missing") return "not found";
  const counted = `${result.outcome}, ${result.rowCount === 1 ? "1 row" : `${result.rowCount} rows`}`;
  return publicLog || !result.message ? counted : `${counted}. ${result.message}`;
}
