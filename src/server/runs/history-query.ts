import { containsText, intParam } from "@/lib/utils/query-params";
import { outcomeFilter } from "./legacy-view";

const HISTORY_DEFAULT_LIMIT = 50;
const HISTORY_MAX_LIMIT = 200;

export interface HistoryParams {
  page: number;
  limit: number;
  scriptName: string | null;
  status: string | null;
  hashtags: string[];
  sortBy: string;
  sortOrder: string;
  includeResults: boolean;
}

export function parseHistoryParams(searchParams: URLSearchParams): HistoryParams {
  return {
    page: intParam(searchParams.get("page"), 1, 1, 100_000),
    limit: intParam(searchParams.get("limit"), HISTORY_DEFAULT_LIMIT, 1, HISTORY_MAX_LIMIT),
    scriptName: searchParams.get("script_name"),
    status: searchParams.get("status"),
    hashtags: (searchParams.get("hashtags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
    sortBy: searchParams.get("sort_by") || "execution_time",
    sortOrder: searchParams.get("sort_order") || "desc",
    includeResults: searchParams.get("include_results") === "true",
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
  };
  if (Object.keys(checkId).length > 0) filter.checkId = checkId;
  const outcome = outcomeFilter(params.status);
  if (outcome) filter.outcome = outcome;
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
