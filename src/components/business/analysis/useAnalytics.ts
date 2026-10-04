import { useCallback, useEffect, useState } from "react";
import { buildAnalytics, historyQuery, runsFromHistory, withTags, type AnalyticsData, type ScriptSummary, type TimeRange } from "./analytics";

async function fetchAnalyticsInputs(timeRange: TimeRange, scriptId: string) {
  const [runsResponse, scriptsResponse] = await Promise.all([fetch(`/api/check-history?${historyQuery(timeRange, scriptId)}`), fetch("/api/checks?view=definitions")]);
  if (!runsResponse.ok || !scriptsResponse.ok) throw new Error(`HTTP ${runsResponse.ok ? scriptsResponse.status : runsResponse.status}`);
  const runs = runsFromHistory(await runsResponse.json());
  const { checks }: { checks: ScriptSummary[] } = await scriptsResponse.json();
  return { runs, checks };
}

/** Loads runs for the filters and the check list, and derives the page's numbers. */
export function useAnalytics(timeRange: TimeRange, scriptId: string, hashtags: string[]) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [scripts, setScripts] = useState<ScriptSummary[]>([]);
  const [attempt, setAttempt] = useState(0);
  const tagKey = hashtags.join(",");
  // Loading until the request for the current filters (and retry) has settled; its error only counts for it.
  const request = JSON.stringify([timeRange, scriptId, tagKey, attempt]);
  const [settled, setSettled] = useState<{ request: string; error: string | null } | null>(null);
  const isLoading = settled?.request !== request;
  const error = settled?.request === request ? settled.error : null;

  useEffect(() => {
    let cancelled = false;
    fetchAnalyticsInputs(timeRange, scriptId)
      .then(({ runs, checks }) => {
        if (cancelled) return;
        setScripts(checks);
        setData(buildAnalytics(withTags(runs, checks, tagKey ? tagKey.split(",") : []), checks, timeRange));
        setSettled({ request, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[analysis] Loading analytics failed:", err);
        setSettled({ request, error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [timeRange, scriptId, tagKey, request]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, scripts, isLoading, error, reload };
}
