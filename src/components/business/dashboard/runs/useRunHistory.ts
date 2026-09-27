import { useCallback, useState } from "react";
import type { Check } from "../types";
import { createHistoryLoader, type HistoryLoadResult } from "./history-loader";
import { DEFAULT_SORT, EMPTY_PAGINATION, nextSort, type HistoryQuery, type SortConfig } from "./runs";

/** One page of run history plus the filters, sort and pager that pick it. */
export function useRunHistory(onError: (message: string) => void) {
  const [checks, setChecks] = useState<Check[]>([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [isLoadingChecks, setIsLoadingChecks] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>(DEFAULT_SORT);
  const [currentPage, setCurrentPage] = useState(1);
  const [loader] = useState(createHistoryLoader);

  const showResult = useCallback(
    async (request: Promise<HistoryLoadResult>) => {
      setIsLoadingChecks(true);
      const result = await request;
      if (result.kind === "stale") return;
      if (result.kind === "error") {
        onError(result.message);
        setChecks([]);
      } else {
        setChecks(result.checks);
        if (result.pagination) setPagination(result.pagination);
      }
      setIsLoadingChecks(false);
    },
    [onError],
  );
  const loadPage = useCallback((query: HistoryQuery) => showResult(loader.load(query)), [loader, showResult]);
  const reload = useCallback(() => showResult(loader.reload()), [loader, showResult]);

  const current = (overrides: Partial<HistoryQuery>): HistoryQuery => ({
    page: 1,
    status: filterStatus,
    search: searchTerm,
    hashtags: selectedHashtags,
    sort: sortConfig,
    ...overrides,
  });

  const requestSort = (key: keyof Check) => {
    const sort = nextSort(sortConfig, key);
    setSortConfig(sort);
    setCurrentPage(1);
    loadPage(current({ sort }));
  };

  const changePage = (page: number) => {
    setCurrentPage(page);
    loadPage(current({ page }));
  };

  const changeStatus = (status: string | null) => {
    setFilterStatus(status);
    setCurrentPage(1);
    loadPage(current({ status }));
  };

  const changeSearch = (search: string) => {
    setSearchTerm(search);
    setCurrentPage(1);
    loadPage(current({ search }));
  };

  const changeHashtags = (hashtags: string[]) => {
    setSelectedHashtags(hashtags);
    setCurrentPage(1);
    loadPage(current({ hashtags }));
  };

  /** Sets the filters without loading, for the first load to pick up. */
  const presetFilters = (filters: { status: string | null; search?: string; hashtags?: string[] }) => {
    setFilterStatus(filters.status);
    if (filters.search !== undefined) setSearchTerm(filters.search);
    if (filters.hashtags !== undefined) setSelectedHashtags(filters.hashtags);
    setCurrentPage(1);
  };

  return {
    checks,
    pagination,
    isLoadingChecks,
    filterStatus,
    searchTerm,
    selectedHashtags,
    sortConfig,
    currentPage,
    loadPage,
    reload,
    hasRequested: loader.hasRequested,
    requestSort,
    changePage,
    changeStatus,
    changeSearch,
    changeHashtags,
    presetFilters,
  };
}
