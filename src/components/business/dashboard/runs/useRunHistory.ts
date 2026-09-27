import { useCallback, useRef, useState } from "react";
import { CHECK_HISTORY_ITEMS_PER_PAGE, type Check } from "../types";
import {
  DEFAULT_SORT,
  EMPTY_PAGINATION,
  buildCheckHistoryQuery,
  nextSort,
  parseChecks,
  parsePagination,
  type HistoryQuery,
  type SortConfig,
} from "./runs";

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
  const isLoadingRef = useRef(false);

  const loadPage = useCallback(
    async (query: HistoryQuery) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setIsLoadingChecks(true);
      try {
        const response = await fetch(`/api/check-history?${buildCheckHistoryQuery(query, CHECK_HISTORY_ITEMS_PER_PAGE)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          console.error("[runs] Loading run history failed:", await response.text());
          throw new Error(`获取检查历史失败: ${response.status} ${response.statusText}`);
        }
        const body = await response.json();
        setChecks(parseChecks(body) ?? []);
        const nextPagination = parsePagination(body);
        if (nextPagination) setPagination(nextPagination);
      } catch (err) {
        console.error("[runs] Loading run history failed:", err);
        onError(err instanceof Error ? err.message : "数据加载失败");
        setChecks([]);
      } finally {
        setIsLoadingChecks(false);
        isLoadingRef.current = false;
      }
    },
    [onError],
  );

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
    isBusy: () => isLoadingRef.current,
    loadPage,
    current,
    requestSort,
    changePage,
    changeStatus,
    changeSearch,
    changeHashtags,
    presetFilters,
  };
}
