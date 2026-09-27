"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, BarChart2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonStatStrip, SkeletonTable } from "@/components/common/PageSkeletons";
import { useLanguage } from "@/components/common/LanguageProvider";
import { dashboardTranslations } from "@/components/business/dashboard/types";
import { AnalysisChartsRow } from "@/components/business/analysis/AnalysisChartsRow";
import { AnalysisFilters } from "@/components/business/analysis/AnalysisFilters";
import { AnalysisSummary } from "@/components/business/analysis/AnalysisSummary";
import { DailyBreakdown } from "@/components/business/analysis/DailyBreakdown";
import { ScriptPerformanceTable } from "@/components/business/analysis/ScriptPerformanceTable";
import { collectTags, DEFAULT_TIME_RANGE, type TimeRange } from "@/components/business/analysis/analytics";
import { useAnalytics } from "@/components/business/analysis/useAnalytics";

export default function DataAnalysisPage() {
  const { language } = useLanguage();
  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);
  const [scriptId, setScriptId] = useState("all");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const { data, scripts, isLoading, error } = useAnalytics(timeRange, scriptId, hashtags);

  const t = useCallback(
    (key: string): string => (dashboardTranslations[language] ?? dashboardTranslations.en)[key as keyof typeof dashboardTranslations.en] || key,
    [language],
  );
  const availableTags = useMemo(() => collectTags(scripts), [scripts]);
  const activeFilters = [timeRange !== DEFAULT_TIME_RANGE, scriptId !== "all", hashtags.length > 0].filter(Boolean).length;
  const filterKey = `${timeRange}|${scriptId}|${hashtags.join(",")}`;

  const resetFilters = () => {
    setTimeRange(DEFAULT_TIME_RANGE);
    setScriptId("all");
    setHashtags([]);
  };

  return (
    <div className="min-h-screen">
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="space-y-8">
            <PageHeader title={t("dataAnalysisTitle")} description={t("dataAnalysisSubTitle")} />

            <AnalysisFilters
              selectedTimeRange={timeRange}
              selectedScript={scriptId}
              selectedHashtags={hashtags}
              scripts={data?.scriptAnalytics ?? []}
              hashtags={availableTags}
              activeCount={activeFilters}
              language={language}
              t={t}
              onTimeRangeChange={setTimeRange}
              onScriptChange={setScriptId}
              onHashtagsChange={setHashtags}
              onReset={resetFilters}
            />

            {data && <AnalysisSummary data={data} t={t} />}
            {data && <AnalysisChartsRow data={data} t={t} />}
            {data && data.dailyTrend.length > 0 && <DailyBreakdown days={data.dailyTrend} language={language} t={t} />}
            {data && data.scriptAnalytics.length > 0 && (
              <ScriptPerformanceTable key={filterKey} scripts={data.scriptAnalytics} language={language} t={t} />
            )}

            {isLoading && (
              <div className="space-y-6" aria-busy="true">
                <SkeletonStatStrip />
                <div className="grid gap-6 lg:grid-cols-2">
                  <Skeleton className="h-[420px] rounded-lg" />
                  <Skeleton className="h-[420px] rounded-lg" />
                </div>
                <SkeletonTable rows={5} />
              </div>
            )}

            {error && (
              <Card className="border border-failure/30 bg-failure/10 gap-0 py-0">
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-failure" />
                  <p className="text-lg font-medium text-failure mb-2">{t("dataLoadFailed")}</p>
                  <p className="text-sm text-failure mb-4">{error}</p>
                </CardContent>
              </Card>
            )}

            {!isLoading && !error && data?.totalExecutions === 0 && (
              <Card className="border border-border/20 gap-0 py-0">
                <CardContent className="p-12 text-center">
                  <BarChart2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">{t("noData")}</p>
                  <p className="text-sm text-muted-foreground">{t("noDataInTimeRange")}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
