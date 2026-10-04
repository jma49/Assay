import { useCallback, useState } from "react";
import type { RunOutcome } from "@/domain/run";
import type { HistoryRun } from "../types";
import { createHistoryLoader, type HistoryLoadResult } from "./history-loader";
import { DEFAULT_SORT, EMPTY_PAGINATION, nextSort, type HistoryQuery, type SortConfig, type SortKey } from "./runs";

/** One page of run history plus the filters, sort and pager that pick it. */
export function useRunHistory(onError: (message: string) => void, language: "en" | "zh", initialSearch = "") {
  const [checks, setChecks] = useState<HistoryRun[]>([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  // The page loads the first page on mount.
  const [isLoadingChecks, setIsLoadingChecks] = useState(true);
  const [filterStatus, setFilterStatus] = useState<RunOutcome | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
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
  const loadPage = useCallback(
    (query: HistoryQuery) => showResult(loader.load({ ...query, language })),
    [loader, showResult, language],
  );
  const reload = useCallback(() => showResult(loader.reload()), [loader, showResult]);

  const current = (overrides: Partial<HistoryQuery>): HistoryQuery => ({
    page: 1,
    outcome: filterStatus,
    search: searchTerm,
    hashtags: selectedHashtags,
    sort: sortConfig,
    ...overrides,
  });

  const requestSort = (key: SortKey) => {
    const sort = nextSort(sortConfig, key);
    setSortConfig(sort);
    setCurrentPage(1);
    void loadPage(current({ sort }));
  };

  const changePage = (page: number) => {
    setCurrentPage(page);
    void loadPage(current({ page }));
  };

  const changeStatus = (outcome: RunOutcome | null) => {
    setFilterStatus(outcome);
    setCurrentPage(1);
    void loadPage(current({ outcome }));
  };

  const changeSearch = (search: string) => {
    setSearchTerm(search);
    setCurrentPage(1);
    void loadPage(current({ search }));
  };

  const changeHashtags = (hashtags: string[]) => {
    setSelectedHashtags(hashtags);
    setCurrentPage(1);
    void loadPage(current({ hashtags }));
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
  };
}
