import { containsText, intParam } from "@/lib/utils/query-params";
import { outcomeFilter } from "./legacy-view";

const HISTORY_DEFAULT_LIMIT = 50;
// Up to 500 runs for the Analysis page's charts; fewer when each carries its rows.
const HISTORY_MAX_LIMIT = 500;
const HISTORY_MAX_LIMIT_WITH_RESULTS = 200;

export interface HistoryParams {
  page: number;
  limit: number;
  scriptName: string | null;
  /** One check, matched exactly (script_name is a text search). */
  checkId: string | null;
  /** Runs that finished in this range; either end may be open. */
  startDate: Date | null;
  endDate: Date | null;
  status: string | null;
  hashtags: string[];
  sortBy: string;
  sortOrder: string;
  includeResults: boolean;
}

function dateParam(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseHistoryParams(searchParams: URLSearchParams): HistoryParams {
  const includeResults = searchParams.get("include_results") === "true";
  const maxLimit = includeResults ? HISTORY_MAX_LIMIT_WITH_RESULTS : HISTORY_MAX_LIMIT;
  return {
    page: intParam(searchParams.get("page"), 1, 1, 100_000),
    limit: intParam(searchParams.get("limit"), HISTORY_DEFAULT_LIMIT, 1, maxLimit),
    scriptName: searchParams.get("script_name"),
    checkId: searchParams.get("scriptId") || null,
    startDate: dateParam(searchParams.get("startDate")),
    endDate: dateParam(searchParams.get("endDate")),
    status: searchParams.get("status"),
    hashtags: (searchParams.get("hashtags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
    sortBy: searchParams.get("sort_by") || "execution_time",
    sortOrder: searchParams.get("sort_order") || "desc",
    includeResults,
  };
}

/**
 * The run filter for the history list. `taggedCheckIds` is the checks
 * carrying every selected hashtag, or null when no hashtag is selected.
 */
export function historyFilter(params: HistoryParams, taggedCheckIds: string[] | null): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  const checkId = {
    ...(params.scriptName && containsText(params.scriptName)),
    ...(taggedCheckIds && { $in: taggedCheckIds }),
    ...(params.checkId && { $eq: params.checkId }),
  };
  if (Object.keys(checkId).length > 0) filter.checkId = checkId;
  const outcome = outcomeFilter(params.status);
  if (outcome) filter.outcome = outcome;
  if (params.startDate || params.endDate) {
    filter.finishedAt = { ...(params.startDate && { $gte: params.startDate }), ...(params.endDate && { $lte: params.endDate }) };
  }
  return filter;
}

/** Sorts on the run's own fields; the older names are what the page sends. */
export function historySort(params: HistoryParams): Record<string, 1 | -1> {
  const direction = params.sortOrder === "asc" ? 1 : -1;
  if (params.sortBy === "script_name") return { checkId: direction, finishedAt: -1 };
  if (params.sortBy === "execution_time") return { finishedAt: direction };
  return { finishedAt: -1 };
}

/** Checks tagged with every one of the given hashtags. */
export function checksWithAllTags(checks: { scriptId: string; hashtags?: string[] }[], hashtags: string[]): string[] {
  return checks.filter((check) => hashtags.every((tag) => check.hashtags?.includes(tag))).map((check) => check.scriptId);
}
