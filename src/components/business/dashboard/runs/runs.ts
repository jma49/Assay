import type { RunOutcome } from "@/domain/run";
import type { CheckStats } from "@/contracts/runs";
import { nextRunAt } from "@/lib/scheduling/due-slot";
import type { HistoryRun, ScriptInfo } from "../types";

/** Sort by when the run finished, or by the check's name in the reader's language. */
export type SortKey = "finishedAt" | "name";
type SortDirection = "ascending" | "descending";

export interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export const DEFAULT_SORT: SortConfig = { key: "finishedAt", direction: "descending" };

export interface HistoryPagination {
  total: number;
  /** More runs match than the server counts (10,000); `total` is that cap. */
  totalCapped: boolean;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const EMPTY_PAGINATION: HistoryPagination = { total: 0, totalCapped: false, totalPages: 0, hasNext: false, hasPrev: false };

export const EMPTY_STATS: CheckStats = { totalCount: 0, successCount: 0, failureCount: 0, needsAttentionCount: 0 };

/** One page of run history as the filters, sort and pager describe it. */
export interface HistoryQuery {
  page: number;
  outcome: RunOutcome | null;
  search: string;
  hashtags: string[];
  sort: SortConfig;
  /** The language names are sorted in. */
  language?: "en" | "zh";
}

/** The sort field and order /api/check-history understands; the table only sorts by check or time. */
export function apiSort(sort: SortConfig): { sortBy: SortKey; sortOrder: "asc" | "desc" } {
  return { sortBy: sort.key, sortOrder: sort.direction === "ascending" ? "asc" : "desc" };
}

/** Clicking the sorted column flips it; a new column starts where people expect: names A to Z, time newest first. */
export function nextSort(current: SortConfig, key: SortKey): SortConfig {
  if (current.key !== key) return { key, direction: key === "name" ? "ascending" : "descending" };
  return { key, direction: current.direction === "ascending" ? "descending" : "ascending" };
}

/** Query string for /api/check-history; the list view never needs the full result rows. */
export function buildCheckHistoryQuery(query: HistoryQuery, pageSize: number): string {
  const params = new URLSearchParams({
    page: query.page.toString(),
    limit: pageSize.toString(),
    include_sample: "false",
  });
  const search = query.search.trim();
  const { sortBy, sortOrder } = apiSort(query.sort);
  if (query.outcome) params.set("outcome", query.outcome);
  if (search) params.set("search", search);
  if (query.hashtags.length > 0) params.set("hashtags", query.hashtags.join(","));
  params.set("sort_by", sortBy);
  params.set("sort_order", sortOrder);
  if (sortBy === "name") params.set("lang", query.language ?? "en");
  return params.toString();
}

/** The runs in a /api/check-history body, or null when it has none. */
export function parseRuns(body: unknown): HistoryRun[] | null {
  const data = (body as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? (data as HistoryRun[]) : null;
}

export function parsePagination(body: unknown): HistoryPagination | null {
  const pagination = (body as { pagination?: HistoryPagination } | null)?.pagination;
  if (!pagination) return null;
  const { total, totalCapped, totalPages, hasNext, hasPrev } = pagination;
  return { total, totalCapped: totalCapped === true, totalPages, hasNext, hasPrev };
}

/** The checks in a GET /api/scripts body, by name (the order the Run sheet lists and preselects them in). */
export function parseScriptList(body: unknown): ScriptInfo[] {
  if (!Array.isArray(body)) return [];
  // Plain code-unit order, as MongoDB sorts names.
  return [...(body as ScriptInfo[])].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Earliest next run across scheduled checks. */
export function nextScheduledRunOf(scripts: ScriptInfo[], now = new Date()): Date | null {
  const next = scripts
    .filter((script) => script.isScheduled && script.cronSchedule)
    .map((script) => nextRunAt(script.cronSchedule!, now)?.getTime())
    .filter((time): time is number => time !== undefined);
  return next.length ? new Date(Math.min(...next)) : null;
}

/** Zero-based index of the first row on the page, and the index just past the last one. */
export function pageRange(currentPage: number, total: number, pageSize: number): { startIndex: number; endIndex: number } {
  return {
    startIndex: total > 0 ? (currentPage - 1) * pageSize : 0,
    endIndex: Math.min(currentPage * pageSize, total),
  };
}

export function passRate(stats: CheckStats): number {
  return stats.totalCount > 0 ? Math.round((stats.successCount / stats.totalCount) * 100) : 0;
}

/**
 * The `?search=` a link to the run history carries (e.g. from a check's page),
 * and the same URL without it so a reload does not apply it again.
 */
export function takeSearchParam(href: string): { search: string; cleanedHref: string } | null {
  const url = new URL(href);
  const search = url.searchParams.get("search");
  if (!search) return null;
  url.searchParams.delete("search");
  return { search: search.trim(), cleanedHref: url.toString() };
}

/** Each check's name in the UI language, keyed by the id the history rows carry. */
export function scriptDisplayNames(scripts: ScriptInfo[], language: string): Map<string, string> {
  return new Map(
    scripts.map((script) => [
      script.scriptId,
      (language === "zh" ? script.cnName || script.name : script.name) || script.scriptId,
    ]),
  );
}
