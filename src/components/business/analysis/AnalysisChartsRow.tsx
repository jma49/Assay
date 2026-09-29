import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { AnalyticsData } from "./analytics";
import { analysisCopy } from "./copy";

// recharts is the bulk of this page's JavaScript; load it after the page shell.
const chartPlaceholder = () => <div className="skeleton-shimmer h-full rounded-md" />;
const StatusPieChart = dynamic(() => import("./AnalysisCharts").then((m) => m.StatusPieChart), {
  ssr: false,
  loading: chartPlaceholder,
});
const DailyTrendChart = dynamic(() => import("./AnalysisCharts").then((m) => m.DailyTrendChart), {
  ssr: false,
  loading: chartPlaceholder,
});

/** A section card with a one-line header; every section on the page uses it so edges and headers line up. */
export function AnalysisSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl bg-card shadow-border">
      <header className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
        <h2 className="text-body-md font-medium">{title}</h2>
        {hint && <span className="text-caption text-muted-foreground">{hint}</span>}
      </header>
      {children}
    </section>
  );
}

export function AnalysisChartsRow({ data, rangeLabel, language }: { data: AnalyticsData; rangeLabel: string; language: string }) {
  const copy = analysisCopy(language);
  const lang = language === "zh" ? "zh" : "en";
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <AnalysisSection title={copy.outcomes} hint={rangeLabel}>
        <div className="h-72 p-4">
          <StatusPieChart counts={data.statusDistribution} language={lang} />
        </div>
      </AnalysisSection>
      <AnalysisSection title={copy.perDay} hint={rangeLabel}>
        <div className="h-72 p-4">
          <DailyTrendChart data={data.dailyTrend} language={lang} allRunsLabel={copy.allRuns} />
        </div>
      </AnalysisSection>
    </div>
  );
}
