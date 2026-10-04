import type { RunOutcome } from "@/domain/run";
import { dayKeysBetween, localDayKey } from "@/lib/utils/datetime";

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

export interface AnalyticsCheck {
  scriptId: string;
  name?: string;
  cnName?: string;
  hashtags?: string[];
}

export type OutcomeCounts = Record<RunOutcome, number>;

export interface CheckAnalytics {
  scriptId: string;
  scriptName: string;
  cnName?: string;
  runs: number;
  counts: OutcomeCounts;
  /** Share of runs that came back clean, 0–100. */
  cleanRate: number;
  lastRun: string;
}

/** One calendar day in the viewer's time zone. */
export interface DailyTrendPoint {
  /** "YYYY-MM-DD" */
  date: string;
  runs: number;
  clean: number;
  issues: number;
  error: number;
}

export interface AnalyticsData {
  totalExecutions: number;
  totalScripts: number;
  /** Share of runs that came back clean, 0–100. */
  cleanRate: number;
  /** Every day of the range, oldest first, including days without runs. */
  dailyTrend: DailyTrendPoint[];
  scriptAnalytics: CheckAnalytics[];
  statusDistribution: OutcomeCounts;
}

export const TIME_RANGES = {
  "7d": { days: 7 },
  "30d": { days: 30 },
  "90d": { days: 90 },
  all: { days: null },
} as const;

export type TimeRange = keyof typeof TIME_RANGES;
export const DEFAULT_TIME_RANGE: TimeRange = "7d";

/** Days listed one by one under the charts; longer ranges show the most recent ones. */
export const DAILY_BREAKDOWN_DAYS = 14;

const rate = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
const noRuns = (): OutcomeCounts => ({ error: 0, issues: 0, clean: 0 });

/**
 * The check-history query for a time range and check ("all" for every check).
 * A range of N days starts at local midnight N - 1 days ago, so it covers
 * exactly the days the trend shows.
 */
export function historyQuery(range: TimeRange, scriptId: string, now = new Date()): URLSearchParams {
  const params = new URLSearchParams({ limit: String(ANALYSIS_RUN_LIMIT) });
  const days = TIME_RANGES[range].days;
  if (days) {
    const start = new Date(now);
    start.setDate(now.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    params.append("startDate", start.toISOString());
    params.append("endDate", now.toISOString());
  }
  if (scriptId !== "all") params.append("checkId", scriptId);
  return params;
}

/**
 * The days a range covers, in the viewer's time zone: the last `days` days
 * up to today, or for "all" from the first run's day to today.
 */
export function rangeDays(range: TimeRange, executions: ExecutionRecord[], now = new Date(), timeZone?: string): string[] {
  const today = localDayKey(now, timeZone);
  const days = TIME_RANGES[range].days;
  if (days) {
    const first = new Date(now);
    first.setDate(now.getDate() - (days - 1));
    return dayKeysBetween(localDayKey(first, timeZone), today);
  }
  if (executions.length === 0) return [];
  const earliest = executions.reduce((min, e) => (e.createdAt < min ? e.createdAt : min), executions[0].createdAt);
  return dayKeysBetween(localDayKey(earliest, timeZone), today);
}

function dailyTrend(executions: ExecutionRecord[], days: string[], timeZone?: string): DailyTrendPoint[] {
  const byDay = new Map<string, DailyTrendPoint>(days.map((date) => [date, { date, runs: 0, ...noRuns() }]));
  for (const execution of executions) {
    const day = byDay.get(localDayKey(execution.createdAt, timeZone));
    if (!day) continue;
    day.runs++;
    day[execution.outcome]++;
  }
  return [...byDay.values()];
}

/** Highest clean rate first; near-equal rates fall back to the run count. */
function byCleanRate(a: CheckAnalytics, b: CheckAnalytics): number {
  if (Math.abs(a.cleanRate - b.cleanRate) < 0.1) return b.runs - a.runs;
  return b.cleanRate - a.cleanRate;
}

function scriptAnalytics(executions: ExecutionRecord[], scripts: AnalyticsCheck[]): CheckAnalytics[] {
  const byId = new Map<string, CheckAnalytics>(
    scripts.map((script) => [
      script.scriptId,
      {
        scriptId: script.scriptId,
        scriptName: script.name || script.scriptId,
        cnName: script.cnName,
        runs: 0,
        counts: noRuns(),
        cleanRate: 0,
        lastRun: "",
      },
    ]),
  );
  for (const execution of executions) {
    const analytics = byId.get(execution.scriptId);
    if (!analytics) continue;
    analytics.runs++;
    analytics.counts[execution.outcome]++;
    if (execution.createdAt > analytics.lastRun) analytics.lastRun = execution.createdAt;
  }
  return [...byId.values()]
    .map((analytics) => ({ ...analytics, cleanRate: rate(analytics.counts.clean, analytics.runs) }))
    .sort(byCleanRate);
}

/** Runs of checks carrying every selected tag (all runs when none is selected). */
export function withTags(executions: ExecutionRecord[], scripts: AnalyticsCheck[], tags: string[]): ExecutionRecord[] {
  if (tags.length === 0) return executions;
  const tagged = new Set(
    scripts.filter((script) => tags.every((tag) => script.hashtags?.includes(tag))).map((script) => script.scriptId),
  );
  return executions.filter((execution) => tagged.has(execution.scriptId));
}

export function buildAnalytics(
  executions: ExecutionRecord[],
  scripts: AnalyticsCheck[],
  range: TimeRange,
  { now = new Date(), timeZone }: { now?: Date; timeZone?: string } = {},
): AnalyticsData {
  const statusDistribution = noRuns();
  for (const execution of executions) statusDistribution[execution.outcome]++;
  return {
    totalExecutions: executions.length,
    totalScripts: scripts.length,
    cleanRate: rate(statusDistribution.clean, executions.length),
    dailyTrend: dailyTrend(executions, rangeDays(range, executions, now, timeZone), timeZone),
    scriptAnalytics: scriptAnalytics(executions, scripts),
    statusDistribution,
  };
}

export function collectTags(scripts: AnalyticsCheck[]): string[] {
  return [...new Set(scripts.flatMap((script) => script.hashtags ?? []))].sort();
}
