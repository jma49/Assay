import { useCallback, useEffect, useRef, useState } from "react";
import { readJson } from "@/client/send-json";
import { ITEMS_PER_PAGE } from "@/components/runs/types";
import type { EditHistoryRecord } from "@/contracts/edit-history";
import { EMPTY_FILTERS, buildHistoryQuery, type HistoryFilters } from "./edit-history";
import { createLatestRequest } from "./latest-request";

/** What GET /api/edit-history answers. */
interface EditHistoryPage {
  histories?: EditHistoryRecord[];
  pagination?: { page?: number; totalPages?: number; total?: number; totalCapped?: boolean };
}

/**
 * Loads one page of the edit history for the given filters: all checks, or
 * only `scriptId`. It loads the first page once `enabled` (by default at once).
 */
export function useEditHistory({ scriptId, pageSize = ITEMS_PER_PAGE, enabled = true }: { scriptId?: string; pageSize?: number; enabled?: boolean } = {}) {
  const [histories, setHistories] = useState<EditHistoryRecord[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalCapped, setTotalCapped] = useState(false);
  const requests = useRef(createLatestRequest({ filters: EMPTY_FILTERS, page: 1 }));

  // A newer request supersedes one still in flight, so the table always matches the latest filters.
  // State is only set once the response is in: the first load runs from an effect.
  const load = useCallback(
    (shown: HistoryFilters = EMPTY_FILTERS, page = 1) => {
      const filters = scriptId ? { ...shown, scriptId } : shown;
      const token = requests.current.start({ filters, page });
      const isStale = () => !requests.current.isLatest(token);
      return fetch(`/api/edit-history?${buildHistoryQuery(filters, page, pageSize)}`)
        .then((response) => readJson<EditHistoryPage>(response, "Failed to fetch edit history"))
        .then((data) => {
          if (isStale()) return;
          setHistories(data.histories || []);
          setTotalPages(data.pagination?.totalPages || 0);
          setTotalRecords(data.pagination?.total || 0);
          setTotalCapped(data.pagination?.totalCapped === true);
          setCurrentPage(data.pagination?.page || 1);
        })
        .catch((err) => {
          if (isStale()) return;
          console.error("Failed to fetch edit history:", err);
          setError(err instanceof Error ? err.message : "Unknown error occurred");
          setHistories([]);
          setTotalPages(0);
          setTotalRecords(0);
        })
        .finally(() => {
          if (!isStale()) setLoading(false);
        });
    },
    [scriptId, pageSize],
  );

  const fetchHistories = useCallback(
    (shown: HistoryFilters = EMPTY_FILTERS, page = 1) => {
      setLoading(true);
      setError(null);
      return load(shown, page);
    },
    [load],
  );

  const retry = useCallback(() => {
    const { filters, page } = requests.current.latestParams();
    void fetchHistories(filters, page);
  }, [fetchHistories]);

  // The first page loads when enabled and again for another check; loading shows from that render on.
  const firstLoad = enabled ? `${scriptId ?? ""}\n${pageSize}` : null;
  const [shownFirstLoad, setShownFirstLoad] = useState(firstLoad);
  if (firstLoad !== shownFirstLoad) {
    setShownFirstLoad(firstLoad);
    if (firstLoad !== null) {
      setLoading(true);
      setError(null);
    }
  }

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  return { histories, loading, error, currentPage, totalPages, totalRecords, totalCapped, fetchHistories, retry };
}
