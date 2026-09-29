import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { CheckStats } from "@/contracts/runs";
import type { ScriptInfo } from "../types";
import { DEFAULT_SORT, EMPTY_STATS, nextScheduledRunOf, parseScriptList, takeSearchParam } from "./runs";
import { useRunHistory } from "./useRunHistory";
import { currentLanguage } from "@/components/common/LanguageProvider";

const scrollToHistory = () => document.getElementById("execution-history")?.scrollIntoView({ behavior: "smooth" });

async function fetchScripts(): Promise<ScriptInfo[]> {
  const response = await fetch("/api/scripts");
  if (!response.ok) {
    throw new Error(`脚本列表获取失败: ${response.status} ${response.statusText}`);
  }
  return parseScriptList(await response.json());
}

/** The overall numbers, or null when they could not be loaded (the page still works without them). */
async function fetchOverallStats(): Promise<CheckStats | null> {
  try {
    const response = await fetch("/api/check-history/stats");
    if (!response.ok) {
      throw new Error(`Loading run stats failed: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (err) {
    console.error("[runs] Loading run stats failed:", err);
    return null;
  }
}

/**
 * Everything the Runs page shows: the check list, overall numbers and the run history.
 * `initialSearch` (a `?search=` link) opens the history filtered to that check.
 */
export function useRunsPage(language: string, initialSearch = "") {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableScripts, setAvailableScripts] = useState<ScriptInfo[]>([]);
  const [isFetchingScripts, setIsFetchingScripts] = useState(true);
  const [nextScheduled, setNextScheduled] = useState<Date | null>(null);
  const [overallStats, setOverallStats] = useState<CheckStats>(EMPTY_STATS);
  const history = useRunHistory(setError, language === "zh" ? "zh" : "en", initialSearch);

  const { loadPage, reload } = history;
  /** Loads the check list, the numbers and the history page `loadHistory` asks for, all at once. */
  const loadAll = useCallback(
    (loadHistory: () => Promise<void>) =>
      Promise.all([
        fetchScripts().then((scripts) => {
          setNextScheduled(nextScheduledRunOf(scripts));
          setAvailableScripts(scripts);
        }),
        loadHistory(),
        fetchOverallStats().then((stats) => stats && setOverallStats(stats)),
      ])
        .then(() => setIsFetchingScripts(false))
        .catch((err) => setError(err instanceof Error ? err.message : "数据加载失败"))
        .finally(() => setLoading(false)),
    [],
  );

  // After a manual run: the new run and numbers, keeping the filters the history shows.
  const refresh = useCallback(() => {
    setLoading(true);
    setIsFetchingScripts(true);
    return loadAll(reload);
  }, [loadAll, reload]);

  // The first load; the loading flags start out set. Later loads come from the filters and the Run sheet.
  useEffect(() => {
    // Strict Mode runs this twice; one request is enough.
    if (history.hasRequested()) return;
    const searchLink = takeSearchParam(window.location.href);
    if (searchLink) window.history.replaceState({}, "", searchLink.cleanedHref);
    if (initialSearch) {
      const zh = currentLanguage() === "zh";
      toast.info(zh ? "正在筛选执行历史" : "Filtering the run history", {
        description: zh ? `检查：${initialSearch}` : `Check: ${initialSearch}`,
        duration: 3000,
      });
      // Leave time for the filtered history to load before scrolling to it.
      setTimeout(scrollToHistory, 1000);
    }
    loadAll(() => loadPage({ page: 1, outcome: null, search: initialSearch, hashtags: [], sort: DEFAULT_SORT }));
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
