import { useCallback, useEffect, useRef, useState } from "react";
import { ITEMS_PER_PAGE } from "@/components/business/dashboard/types";
import type { EditHistoryRecord } from "@/lib/workflows/edit-history-schema";
import { EMPTY_FILTERS, buildHistoryQuery, type HistoryFilters } from "./edit-history";
import { createLatestRequest } from "./latest-request";

/** Loads one page of the global edit history for the given filters. */
export function useEditHistory() {
  const [histories, setHistories] = useState<EditHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalCapped, setTotalCapped] = useState(false);
  const requests = useRef(createLatestRequest({ filters: EMPTY_FILTERS, page: 1 }));

  // A newer request supersedes one still in flight, so the table always matches the latest filters.
  const fetchHistories = useCallback(async (filters: HistoryFilters = EMPTY_FILTERS, page = 1) => {
    const token = requests.current.start({ filters, page });
    const isStale = () => !requests.current.isLatest(token);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/edit-history?${buildHistoryQuery(filters, page, ITEMS_PER_PAGE)}`);
      if (!response.ok) {
        if (response.status === 401) throw new Error("Unauthorized access");
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch edit history");
      }
      const data = await response.json();
      if (isStale()) return;
      setHistories(data.histories || []);
      setTotalPages(data.pagination?.totalPages || 0);
      setTotalRecords(data.pagination?.total || 0);
      setTotalCapped(data.pagination?.totalCapped === true);
      setCurrentPage(data.pagination?.page || 1);
    } catch (err) {
      if (isStale()) return;
      console.error("Failed to fetch edit history:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setHistories([]);
      setTotalPages(0);
      setTotalRecords(0);
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    const { filters, page } = requests.current.latestParams();
    fetchHistories(filters, page);
  }, [fetchHistories]);

  useEffect(() => {
    fetchHistories();
  }, [fetchHistories]);

  return { histories, loading, error, currentPage, totalPages, totalRecords, totalCapped, fetchHistories, retry };
}
