import type { RunOutcome } from "@/domain/run";
import { containsText, intParam } from "@/lib/utils/query-params";

const HISTORY_DEFAULT_LIMIT = 50;
// Up to 500 runs for the Analysis page's charts; fewer when each carries its rows.
const HISTORY_MAX_LIMIT = 500;
const HISTORY_MAX_LIMIT_WITH_RESULTS = 200;

export interface HistoryParams {
  page: number;
  limit: number;
  /** Text search on the check id. */
  search: string | null;
  /** One check, matched exactly. */
  checkId: string | null;
  /** Runs that finished in this range; either end may be open. */
  startDate: Date | null;
  endDate: Date | null;
  outcome: RunOutcome | null;
  hashtags: string[];
  sortBy: "finishedAt" | "checkId";
  sortOrder: "asc" | "desc";
  includeSample: boolean;
}

const OUTCOMES: readonly RunOutcome[] = ["clean", "issues", "error"];
const outcomeParam = (value: string | null): RunOutcome | null => (OUTCOMES.includes(value as RunOutcome) ? (value as RunOutcome) : null);

function dateParam(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseHistoryParams(searchParams: URLSearchParams): HistoryParams {
  const includeSample = searchParams.get("include_sample") === "true";
  const maxLimit = includeSample ? HISTORY_MAX_LIMIT_WITH_RESULTS : HISTORY_MAX_LIMIT;
  return {
    page: intParam(searchParams.get("page"), 1, 1, 100_000),
    limit: intParam(searchParams.get("limit"), HISTORY_DEFAULT_LIMIT, 1, maxLimit),
    search: searchParams.get("search") || null,
    checkId: searchParams.get("checkId") || null,
    startDate: dateParam(searchParams.get("startDate")),
    endDate: dateParam(searchParams.get("endDate")),
    outcome: outcomeParam(searchParams.get("outcome")),
    hashtags: (searchParams.get("hashtags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
    sortBy: searchParams.get("sort_by") === "checkId" ? "checkId" : "finishedAt",
    sortOrder: searchParams.get("sort_order") === "asc" ? "asc" : "desc",
    includeSample,
  };
}

/**
 * The run filter for the history list. `taggedCheckIds` is the checks
 * carrying every selected hashtag, or null when no hashtag is selected.
 */
export function historyFilter(params: HistoryParams, taggedCheckIds: string[] | null): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  const checkId = {
    ...(params.search && containsText(params.search)),
    ...(taggedCheckIds && { $in: taggedCheckIds }),
    ...(params.checkId && { $eq: params.checkId }),
  };
  if (Object.keys(checkId).length > 0) filter.checkId = checkId;
  if (params.outcome) filter.outcome = params.outcome;
  if (params.startDate || params.endDate) {
    filter.finishedAt = { ...(params.startDate && { $gte: params.startDate }), ...(params.endDate && { $lte: params.endDate }) };
  }
  return filter;
}

/** By check (newest first within one), or by time. */
export function historySort(params: HistoryParams): Record<string, 1 | -1> {
  const direction = params.sortOrder === "asc" ? 1 : -1;
  if (params.sortBy === "checkId") return { checkId: direction, finishedAt: -1 };
  return { finishedAt: direction };
}

/** Checks tagged with every one of the given hashtags. */
export function checksWithAllTags(checks: { scriptId: string; hashtags?: string[] }[], hashtags: string[]): string[] {
  return checks.filter((check) => hashtags.every((tag) => check.hashtags?.includes(tag))).map((check) => check.scriptId);
}
