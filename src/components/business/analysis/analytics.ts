import type { RunOutcome } from "@/domain/run";
import { localDayKey } from "@/lib/utils/datetime";

/** A run the page counts. */
export interface ExecutionRecord {
  _id: string;
  scriptId: string;
  outcome: RunOutcome;
  createdAt: string;
}

/** A run as /api/check-history lists it. */
interface HistoryRun {
  _id: string;
  checkId: string;
  finishedAt: string;
  outcome: RunOutcome;
}

/** Most runs the charts read: the newest ones in the range. */
const ANALYSIS_RUN_LIMIT = 500;

/** The runs in a /api/check-history body. */
export function runsFromHistory(body: { data?: HistoryRun[] } | null): ExecutionRecord[] {
  return (body?.data ?? []).map((run) => ({
    _id: run._id,
    scriptId: run.checkId,
    outcome: run.outcome,
    createdAt: run.finishedAt,
  }));
}

export interface ScriptSummary {
  scriptId: string;
  name?: string;
  hashtags?: string[];
}

export interface ScriptAnalytics {
  scriptId: string;
  scriptName: string;
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  attentionCount: number;
  successRate: number;
  lastExecution: string;
}

export interface DailyTrendPoint {
  date: string;
  executions: number;
  successes: number;
  failures: number;
}

export interface AnalyticsData {
  totalExecutions: number;
  totalScripts: number;
  overallSuccessRate: number;
  dailyTrend: DailyTrendPoint[];
  scriptAnalytics: ScriptAnalytics[];
  statusDistribution: { success: number; failed: number; attention_needed: number };
}

export const TIME_RANGES = {
  "7d": { label: "last7Days", days: 7 },
  "30d": { label: "last30Days", days: 30 },
  "90d": { label: "last90Days", days: 90 },
  all: { label: "allTime", days: null },
} as const;

export type TimeRange = keyof typeof TIME_RANGES;
export const DEFAULT_TIME_RANGE: TimeRange = "7d";

const rate = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

/** The check-history query for a time range and check ("all" for every check). */
export function historyQuery(range: TimeRange, scriptId: string, now = new Date()): URLSearchParams {
  const params = new URLSearchParams({ limit: String(ANALYSIS_RUN_LIMIT) });
  const days = TIME_RANGES[range].days;
  if (days) {
    const start = new Date(now);
    start.setDate(now.getDate() - days);
    params.append("startDate", start.toISOString());
    params.append("endDate", now.toISOString());
  }
  if (scriptId !== "all") params.append("checkId", scriptId);
  return params;
}

function dailyTrend(executions: ExecutionRecord[]): DailyTrendPoint[] {
  const days = new Map<string, DailyTrendPoint>();
  for (const execution of executions) {
    const date = localDayKey(execution.createdAt);
    const day = days.get(date) ?? { date, executions: 0, successes: 0, failures: 0 };
    day.executions++;
    if (execution.outcome === "clean") day.successes++;
    else day.failures++;
    days.set(date, day);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Highest pass rate first; near-equal rates fall back to the run count. */
function byPassRate(a: ScriptAnalytics, b: ScriptAnalytics): number {
  if (Math.abs(a.successRate - b.successRate) < 0.1) return b.totalExecutions - a.totalExecutions;
  return b.successRate - a.successRate;
}

function scriptAnalytics(executions: ExecutionRecord[], scripts: ScriptSummary[]): ScriptAnalytics[] {
  const byId = new Map<string, ScriptAnalytics>(
    scripts.map((script) => [
      script.scriptId,
      {
        scriptId: script.scriptId,
        scriptName: script.name || script.scriptId,
        totalExecutions: 0,
        successCount: 0,
        failedCount: 0,
        attentionCount: 0,
        successRate: 0,
        lastExecution: "",
      },
    ]),
  );
  for (const execution of executions) {
    const analytics = byId.get(execution.scriptId);
    if (!analytics) continue;
    analytics.totalExecutions++;
    if (execution.outcome === "clean") analytics.successCount++;
    else if (execution.outcome === "error") analytics.failedCount++;
    else analytics.attentionCount++;
    if (execution.createdAt > analytics.lastExecution) analytics.lastExecution = execution.createdAt;
  }
  return [...byId.values()]
    .map((analytics) => ({ ...analytics, successRate: rate(analytics.successCount, analytics.totalExecutions) }))
    .sort(byPassRate);
}

/** Runs of checks carrying every selected tag (all runs when none is selected). */
export function withTags(executions: ExecutionRecord[], scripts: ScriptSummary[], tags: string[]): ExecutionRecord[] {
  if (tags.length === 0) return executions;
  const tagged = new Set(
    scripts.filter((script) => tags.every((tag) => script.hashtags?.includes(tag))).map((script) => script.scriptId),
  );
  return executions.filter((execution) => tagged.has(execution.scriptId));
}

export function buildAnalytics(executions: ExecutionRecord[], scripts: ScriptSummary[]): AnalyticsData {
  const count = (outcome: RunOutcome) => executions.filter((e) => e.outcome === outcome).length;
  const statusDistribution = { success: count("clean"), failed: count("error"), attention_needed: count("issues") };
  return {
    totalExecutions: executions.length,
    totalScripts: scripts.length,
    overallSuccessRate: rate(statusDistribution.success, executions.length),
    dailyTrend: dailyTrend(executions),
    scriptAnalytics: scriptAnalytics(executions, scripts),
    statusDistribution,
  };
}

export function collectTags(scripts: ScriptSummary[]): string[] {
  return [...new Set(scripts.flatMap((script) => script.hashtags ?? []))].sort();
}
