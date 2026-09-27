import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsData } from "./analytics";

// recharts is the bulk of this page's JavaScript; load it after the page shell.
const chartPlaceholder = () => <div className="h-full animate-pulse rounded-md bg-muted/40" />;
const StatusPieChart = dynamic(() => import("./AnalysisCharts").then((m) => m.StatusPieChart), {
  ssr: false,
  loading: chartPlaceholder,
});
const TrendLineChart = dynamic(() => import("./AnalysisCharts").then((m) => m.TrendLineChart), {
  ssr: false,
  loading: chartPlaceholder,
});

export function AnalysisChartsRow({ data, t }: { data: AnalyticsData; t: (key: string) => string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="relative overflow-hidden gap-0 py-0">

        <CardHeader className="relative border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <CardTitle>
                {t('statusDistribution')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t('executionResultsStats')}</p>
            </div>
          </div>
        </CardHeader>

                          <CardContent className="relative px-6 py-6">
          <div className="h-80">
            <StatusPieChart
              success={data.statusDistribution.success}
              failed={data.statusDistribution.failed}
              attention={data.statusDistribution.attention_needed}
              labels={{ success: t("successLabel"), failed: t("failedLabel"), attention: t("attentionLabel") }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden gap-0 py-0">

        <CardHeader className="relative border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <CardTitle>
                {t('executionTrend')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t('recent14DaysTrend')}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative px-6 py-6">
          <div className="h-80">
            <TrendLineChart
              data={data.dailyTrend.slice(-14)}
              labels={{
                date: t("date"),
                total: t("totalExecutions"),
                success: t("successfulExecutions"),
                failed: t("failedExecutions"),
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
