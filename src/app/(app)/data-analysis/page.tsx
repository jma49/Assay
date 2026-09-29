"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/common/LanguageProvider";
import { AnalysisChartsRow } from "@/components/business/analysis/AnalysisChartsRow";
import { AnalysisFilters } from "@/components/business/analysis/AnalysisFilters";
import { AnalysisSummary } from "@/components/business/analysis/AnalysisSummary";
import { DailyBreakdown } from "@/components/business/analysis/DailyBreakdown";
import { ScriptPerformanceTable } from "@/components/business/analysis/ScriptPerformanceTable";
import { collectTags, DAILY_BREAKDOWN_DAYS, DEFAULT_TIME_RANGE, type TimeRange } from "@/components/business/analysis/analytics";
import { analysisCopy } from "@/components/business/analysis/copy";
import { useAnalytics } from "@/components/business/analysis/useAnalytics";

export default function DataAnalysisPage() {
  const { language } = useLanguage();
  const copy = analysisCopy(language);
  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);
  const [scriptId, setScriptId] = useState("all");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const { data, scripts, isLoading, error, reload } = useAnalytics(timeRange, scriptId, hashtags);

  const availableTags = useMemo(() => collectTags(scripts), [scripts]);
  const filtered = timeRange !== DEFAULT_TIME_RANGE || scriptId !== "all" || hashtags.length > 0;
  const rangeLabel = copy.ranges[timeRange];
  const recentDays = data?.dailyTrend.slice(-DAILY_BREAKDOWN_DAYS) ?? [];

  const resetFilters = () => {
    setTimeRange(DEFAULT_TIME_RANGE);
    setScriptId("all");
    setHashtags([]);
  };

  return (
    <div className={`${APP_CONTAINER} space-y-5 py-6`}>
      <PageHeader title={copy.title} description={copy.description} />

      <AnalysisFilters
        timeRange={timeRange}
        scriptId={scriptId}
        hashtags={hashtags}
        scripts={scripts}
        availableTags={availableTags}
        filtered={filtered}
        language={language}
        onTimeRangeChange={setTimeRange}
        onScriptChange={setScriptId}
        onHashtagsChange={setHashtags}
        onReset={resetFilters}
      />

      {error ? (
        <div className="rounded-xl bg-card px-6 py-10 text-center shadow-border">
          <p className="text-body-md font-medium">{copy.loadFailed}</p>
          <p className="mt-1 font-mono text-caption text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={reload}>
            {copy.retry}
          </Button>
        </div>
      ) : !data ? (
        <div className="space-y-5" aria-busy="true">
          <div className="skeleton-shimmer h-[98px] rounded-xl" />
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="skeleton-shimmer h-[331px] rounded-xl" />
            <div className="skeleton-shimmer h-[331px] rounded-xl" />
          </div>
          <div className="skeleton-shimmer h-64 rounded-xl" />
        </div>
      ) : (
        <div className={isLoading ? "space-y-5 opacity-60 transition-opacity" : "space-y-5 transition-opacity"} aria-busy={isLoading}>
          <AnalysisSummary data={data} language={language} />
          {data.totalExecutions === 0 ? (
            <div className="rounded-xl bg-card px-6 py-12 text-center shadow-border">
              <p className="text-body-md">{copy.empty}</p>
              <p className="mt-1 text-body-sm text-muted-foreground">{copy.emptyHint}</p>
            </div>
          ) : (
            <>
              <AnalysisChartsRow data={data} rangeLabel={rangeLabel} language={language} />
              <DailyBreakdown days={recentDays} hint={timeRange === "7d" ? rangeLabel : copy.lastDays(recentDays.length)} language={language} />
              <ScriptPerformanceTable key={`${timeRange}|${scriptId}|${hashtags.join(",")}`} scripts={data.scriptAnalytics} hint={rangeLabel} language={language} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
