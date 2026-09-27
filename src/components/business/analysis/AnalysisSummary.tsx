import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/utils";
import type { AnalyticsData } from "./analytics";

export function AnalysisSummary({ data, t }: { data: AnalyticsData; t: (key: string) => string }) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1 bg-card px-5 py-4">
        <dt className="text-[13px] text-muted-foreground">{t("totalExecutions")}</dt>
        <dd className="text-[24px] leading-tight font-semibold tabular-nums">
          {data.totalExecutions.toLocaleString()}
        </dd>
        <dd className="text-[13px] text-muted-foreground">
          {data.totalScripts} {t("scriptsCount")}
        </dd>
      </div>
      <div className="space-y-1 bg-card px-5 py-4">
        <dt className="text-[13px] text-muted-foreground">{t("overallSuccessRate")}</dt>
        <dd
          className={cn(
            "text-[24px] leading-tight font-semibold tabular-nums",
            data.overallSuccessRate >= 80 ? "text-success" : "text-attention",
          )}
        >
          {data.overallSuccessRate.toFixed(1)}
          <span className="ml-0.5 text-base font-normal text-muted-foreground">%</span>
        </dd>
        <dd className="pt-1">
          <Progress value={data.overallSuccessRate} className="h-1" />
        </dd>
      </div>
      <div className="space-y-1 bg-card px-5 py-4">
        <dt className="text-[13px] text-muted-foreground">{t("successfulExecutions")}</dt>
        <dd className="text-[24px] leading-tight font-semibold text-success tabular-nums">
          {data.statusDistribution.success.toLocaleString()}
        </dd>
        <dd className="text-[13px] text-muted-foreground">
          {(
            (data.statusDistribution.success / data.totalExecutions) *
            100
          ).toFixed(1)}
          % {t("of")} {t("totalExecutions")}
        </dd>
      </div>
      <div className="space-y-1 bg-card px-5 py-4">
        <dt className="text-[13px] text-muted-foreground">{t("failedAttentionExecutions")}</dt>
        <dd className="text-[24px] leading-tight font-semibold text-attention tabular-nums">
          {(
            data.statusDistribution.failed +
            data.statusDistribution.attention_needed
          ).toLocaleString()}
        </dd>
        <dd className="flex gap-3 text-[13px]">
          <span className="text-failure">
            {data.statusDistribution.failed} {t("failedLabel")}
          </span>
          <span className="text-attention">
            {data.statusDistribution.attention_needed} {t("attentionLabel")}
          </span>
        </dd>
      </div>
    </dl>
  );
}
