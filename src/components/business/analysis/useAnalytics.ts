import { useEffect, useState } from "react";
import { buildAnalytics, historyQuery, runsFromHistory, withTags, type AnalyticsData, type ScriptSummary, type TimeRange } from "./analytics";

/** Loads runs for the filters and the check list, and derives the page's numbers. */
export function useAnalytics(timeRange: TimeRange, scriptId: string, hashtags: string[]) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [scripts, setScripts] = useState<ScriptSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tagKey = hashtags.join(",");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    (async () => {
      try {
        const [runsResponse, scriptsResponse] = await Promise.all([
          fetch(`/api/check-history?${historyQuery(timeRange, scriptId)}`),
          fetch("/api/scripts"),
        ]);
        if (!runsResponse.ok || !scriptsResponse.ok) throw new Error("Failed to fetch data");
        const runs = runsFromHistory(await runsResponse.json());
        const checks: ScriptSummary[] = await scriptsResponse.json();
        if (cancelled) return;
        setScripts(checks);
        setData(buildAnalytics(withTags(runs, checks, tagKey ? tagKey.split(",") : []), checks));
      } catch (err) {
        if (cancelled) return;
        console.error("[analysis] Loading analytics failed:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [timeRange, scriptId, tagKey]);

  return { data, scripts, isLoading, error };
}
