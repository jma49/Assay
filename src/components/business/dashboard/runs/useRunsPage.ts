import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { CheckStats } from "@/lib/database/check-stats";
import type { ScriptInfo } from "../types";
import { DEFAULT_SORT, EMPTY_STATS, parseNextScheduled, parseScriptList, takeSearchParam } from "./runs";
import { useRunHistory } from "./useRunHistory";

const scrollToHistory = () => document.getElementById("execution-history")?.scrollIntoView({ behavior: "smooth" });

/**
 * Everything the Runs page shows: the check list, overall numbers and the run history.
 * A `?search=` link opens the history filtered to that check.
 */
export function useRunsPage(language: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableScripts, setAvailableScripts] = useState<ScriptInfo[]>([]);
  const [isFetchingScripts, setIsFetchingScripts] = useState(true);
  const [nextScheduled, setNextScheduled] = useState<Date | null>(null);
  const [overallStats, setOverallStats] = useState<CheckStats>(EMPTY_STATS);
  const history = useRunHistory(setError);

  const loadScripts = useCallback(async () => {
    const response = await fetch("/api/list-scripts", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`脚本列表获取失败: ${response.status} ${response.statusText}`);
    }
    const body = await response.json();
    setNextScheduled(parseNextScheduled(body));
    setAvailableScripts(parseScriptList(body));
  }, []);

  const loadOverallStats = useCallback(async () => {
    try {
      const response = await fetch("/api/check-history/stats");
      if (!response.ok) {
        throw new Error(`Loading run stats failed: ${response.status} ${response.statusText}`);
      }
      setOverallStats(await response.json());
    } catch (err) {
      console.error("[runs] Loading run stats failed:", err);
    }
  }, []);

  const { loadPage, reload } = history;
  /** Loads the check list, the numbers and the history page `loadHistory` asks for, all at once. */
  const loadAll = useCallback(
    async (loadHistory: () => Promise<void>) => {
      setLoading(true);
      setIsFetchingScripts(true);
      try {
        await Promise.all([loadScripts(), loadHistory(), loadOverallStats()]);
        setIsFetchingScripts(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "数据加载失败");
      } finally {
        setLoading(false);
      }
    },
    [loadScripts, loadOverallStats],
  );

  // After a manual run: the new run and numbers, keeping the filters the history shows.
  const refresh = useCallback(() => loadAll(reload), [loadAll, reload]);

  const openFilteredBySearch = (search: string) => {
    history.presetFilters({ status: null, search, hashtags: [] });
    toast.info(language === "zh" ? "正在筛选执行历史" : "Filtering run history", {
      description: language === "zh" ? `搜索脚本: ${search}` : `Script: ${search}`,
      duration: 3000,
    });
    // Leave time for the filtered history to load before scrolling to it.
    setTimeout(scrollToHistory, 1000);
    setLoading(true);
    setIsFetchingScripts(true);
    loadPage({ page: 1, status: null, search, hashtags: [], sort: DEFAULT_SORT });
    Promise.all([loadScripts(), loadOverallStats()])
      .catch((err) => setError(err instanceof Error ? err.message : "数据加载失败"))
      .finally(() => {
        setLoading(false);
        setIsFetchingScripts(false);
      });
  };

  useEffect(() => {
    // Strict Mode runs this twice; by then the search link is gone from the URL,
    // so a second pass would replace the filtered load with an unfiltered one.
    if (history.hasRequested()) return;
    const searchLink = takeSearchParam(window.location.href);
    if (searchLink) {
      window.history.replaceState({}, "", searchLink.cleanedHref);
      openFilteredBySearch(searchLink.search);
    } else {
      loadAll(() => loadPage({ page: 1, status: null, search: "", hashtags: [], sort: DEFAULT_SORT }));
    }
    // Runs once on mount; later loads come from the filters and the Run sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    loading,
    error,
    availableScripts,
    isFetchingScripts,
    nextScheduled,
    overallStats,
    history,
    refresh,
  };
}
