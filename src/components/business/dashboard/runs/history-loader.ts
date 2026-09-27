import { createLatestRequest } from "@/components/business/edit-history/latest-request";
import { CHECK_HISTORY_ITEMS_PER_PAGE, type Check } from "../types";
import { buildCheckHistoryQuery, parseChecks, parsePagination, type HistoryPagination, type HistoryQuery } from "./runs";

export type HistoryLoadResult =
  | { kind: "page"; checks: Check[]; pagination: HistoryPagination | null }
  | { kind: "error"; message: string }
  /** A newer request was made meanwhile; its result is the one to show. */
  | { kind: "stale" };

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Loads pages of run history. A newer request supersedes one still in flight,
 * so the table always matches the latest filters.
 */
export function createHistoryLoader(fetchImpl: Fetch = (input, init) => fetch(input, init)) {
  const requests = createLatestRequest<HistoryQuery | null>(null);

  const load = async (query: HistoryQuery): Promise<HistoryLoadResult> => {
    const token = requests.start(query);
    let result: HistoryLoadResult;
    try {
      const response = await fetchImpl(`/api/check-history?${buildCheckHistoryQuery(query, CHECK_HISTORY_ITEMS_PER_PAGE)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        console.error("[runs] Loading run history failed:", await response.text());
        throw new Error(`获取检查历史失败: ${response.status} ${response.statusText}`);
      }
      const body = await response.json();
      result = { kind: "page", checks: parseChecks(body) ?? [], pagination: parsePagination(body) };
    } catch (err) {
      console.error("[runs] Loading run history failed:", err);
      result = { kind: "error", message: err instanceof Error ? err.message : "数据加载失败" };
    }
    return requests.isLatest(token) ? result : { kind: "stale" };
  };

  /** Loads the last requested page again, with the filters it was requested with. */
  const reload = (): Promise<HistoryLoadResult> => {
    const query = requests.latestParams();
    return query ? load(query) : Promise.resolve({ kind: "stale" });
  };

  return { load, reload };
}
