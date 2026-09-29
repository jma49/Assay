import type { RunOutcome } from "@/domain/run";
import { containsText, intParam } from "@/lib/utils/query-params";
import { maxPage } from "@/server/http/paging";

const HISTORY_DEFAULT_LIMIT = 50;
// Up to 500 runs for the Analysis page's charts.
const HISTORY_MAX_LIMIT = 500;

export interface HistoryParams {
  page: number;
  limit: number;
  /** Text search on the check id and, through `nameMatches`, the check's names. */
  search: string | null;
  /** One check, matched exactly. */
  checkId: string | null;
  /** Runs that finished in this range; either end may be open. */
  startDate: Date | null;
  endDate: Date | null;
  outcome: RunOutcome | null;
  hashtags: string[];
  /** `name` orders by the check's name in `language`; `checkId` is kept for older clients. */
  sortBy: "finishedAt" | "checkId" | "name";
  sortOrder: "asc" | "desc";
  language: "en" | "zh";
}

/** The check fields the name search and name sort read. */
export interface CheckName {
  scriptId: string;
  name?: string;
  cnName?: string;
}

const SORT_KEYS = ["finishedAt", "checkId", "name"] as const;

const OUTCOMES: readonly RunOutcome[] = ["clean", "issues", "error"];
const outcomeParam = (value: string | null): RunOutcome | null => (OUTCOMES.includes(value as RunOutcome) ? (value as RunOutcome) : null);

function dateParam(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The run list's query. It never carries sample rows: a page of runs with
 * their samples could pass Vercel's 4.5 MB response limit many times over,
 * so a run's rows come from /api/execution-details one run at a time.
 */
export function parseHistoryParams(searchParams: URLSearchParams): HistoryParams {
  const limit = intParam(searchParams.get("limit"), HISTORY_DEFAULT_LIMIT, 1, HISTORY_MAX_LIMIT);
  return {
    page: intParam(searchParams.get("page"), 1, 1, maxPage(limit)),
    limit,
    search: searchParams.get("search") || null,
    checkId: searchParams.get("checkId") || null,
    startDate: dateParam(searchParams.get("startDate")),
    endDate: dateParam(searchParams.get("endDate")),
    outcome: outcomeParam(searchParams.get("outcome")),
    hashtags: (searchParams.get("hashtags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
    sortBy: SORT_KEYS.find((key) => key === searchParams.get("sort_by")) ?? "finishedAt",
    sortOrder: searchParams.get("sort_order") === "asc" ? "asc" : "desc",
    language: searchParams.get("lang") === "zh" ? "zh" : "en",
  };
}

/**
 * The run filter for the history list. `taggedCheckIds` is the checks
 * carrying every selected hashtag, or null when no hashtag is selected;
 * `nameMatches` the checks whose name contains the search.
 */
export function historyFilter(
  params: HistoryParams,
  taggedCheckIds: string[] | null,
  nameMatches: string[] = [],
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  const byName = params.search !== null && nameMatches.length > 0;
  const checkId = {
    ...(params.search && !byName && containsText(params.search)),
    ...(taggedCheckIds && { $in: taggedCheckIds }),
    ...(params.checkId && { $eq: params.checkId }),
  };
  if (Object.keys(checkId).length > 0) filter.checkId = checkId;
  if (byName) filter.$or = [{ checkId: containsText(params.search!) }, { checkId: { $in: nameMatches } }];
  if (params.outcome) filter.outcome = params.outcome;
  if (params.startDate || params.endDate) {
    filter.finishedAt = { ...(params.startDate && { $gte: params.startDate }), ...(params.endDate && { $lte: params.endDate }) };
  }
  return filter;
}

const displayName = (check: CheckName, language: "en" | "zh") =>
  (language === "zh" ? check.cnName || check.name : check.name) || check.scriptId;

/** Checks whose English or Chinese name contains the search, ignoring case. */
export function checksMatchingName(checks: CheckName[], search: string): string[] {
  const text = search.trim().toLowerCase();
  if (!text) return [];
  return checks
    .filter((check) => [check.name, check.cnName].some((name) => name?.toLowerCase().includes(text)))
    .map((check) => check.scriptId);
}

/** Check ids in the order their names read in `language`. */
export function checkNameOrder(checks: CheckName[], language: "en" | "zh"): string[] {
  const collator = new Intl.Collator(language === "zh" ? "zh-CN" : "en", { sensitivity: "base", numeric: true });
  return [...checks]
    .sort((a, b) => collator.compare(displayName(a, language), displayName(b, language)))
    .map((check) => check.scriptId);
}

/**
 * One page of runs ordered by their check's name (newest first within a
 * check). Runs of checks that no longer exist sort after the named ones.
 */
export function nameSortPipeline(
  filter: Record<string, unknown>,
  order: string[],
  params: Pick<HistoryParams, "sortOrder" | "page" | "limit">,
  projection: Record<string, 1>,
): Record<string, unknown>[] {
  const direction = params.sortOrder === "asc" ? 1 : -1;
  return [
    { $match: filter },
    {
      $addFields: {
        _nameRank: {
          $let: {
            vars: { rank: { $indexOfArray: [order, "$checkId"] } },
            in: { $cond: [{ $lt: ["$$rank", 0] }, order.length, "$$rank"] },
          },
        },
      },
    },
    { $sort: { _nameRank: direction, checkId: direction, finishedAt: -1 } },
    { $skip: (params.page - 1) * params.limit },
    { $limit: params.limit },
    { $project: projection },
  ];
}

/** By check id (newest first within one), or by time; sorting by name goes through `nameSortPipeline`. */
export function historySort(params: HistoryParams): Record<string, 1 | -1> {
  const direction = params.sortOrder === "asc" ? 1 : -1;
  if (params.sortBy === "checkId") return { checkId: direction, finishedAt: -1 };
  return { finishedAt: direction };
}

/** Checks tagged with every one of the given hashtags. */
export function checksWithAllTags(checks: { scriptId: string; hashtags?: string[] }[], hashtags: string[]): string[] {
  return checks.filter((check) => hashtags.every((tag) => check.hashtags?.includes(tag))).map((check) => check.scriptId);
}
