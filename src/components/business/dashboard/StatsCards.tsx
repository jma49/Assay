import React from "react";
import { cn } from "@/lib/utils/utils";
import { DashboardTranslationKeys } from "./types";

interface StatsCardsProps {
  nextScheduled: Date | null;
  successCount: number;
  allChecksCount: number;
  needsAttentionCount: number;
  successRate: number;
  language: string;
  t: (key: DashboardTranslationKeys) => string;
  isVerticalLayout?: boolean;
}

interface StatItem {
  title: string;
  value: number | string;
  unit?: string;
  description: string;
  tone: "neutral" | "success" | "attention";
}

const toneClass: Record<StatItem["tone"], string> = {
  neutral: "text-foreground",
  success: "text-success",
  attention: "text-attention",
};

export const StatsCards: React.FC<StatsCardsProps> = ({
  successCount,
  allChecksCount,
  needsAttentionCount,
  successRate,
  t,
  isVerticalLayout = false,
}) => {
  const needsAttentionRate =
    allChecksCount > 0
      ? Math.round((needsAttentionCount / allChecksCount) * 100)
      : 0;

  const stats: StatItem[] = [
    {
      title: t("totalChecks"),
      value: allChecksCount,
      description: t("totalChecksExecuted"),
      tone: "neutral",
    },
    {
      title: t("checksSucceeded"),
      value: successCount,
      description:
        successRate > 0
          ? `${t("successRate")} ${successRate}%`
          : t("noSuccessRecords"),
      tone: "success",
    },
    {
      title: t("needsAttention"),
      value: needsAttentionCount,
      description:
        allChecksCount > 0
          ? `${t("needsAttentionRatePercentage")} ${needsAttentionRate}%`
          : t("noAttentionRecords"),
      tone: needsAttentionCount > 0 ? "attention" : "success",
    },
    {
      title: t("successRate"),
      value: successRate,
      unit: "%",
      description:
        allChecksCount > 0
          ? `${t("totalChecks")} ${allChecksCount}`
          : t("noSuccessRecords"),
      tone: successRate >= 80 ? "success" : successRate >= 60 ? "neutral" : "attention",
    },
  ];

  return (
    <dl
      className={cn(
        "overflow-hidden rounded-lg border bg-card",
        isVerticalLayout
          ? "grid h-full grid-rows-4 divide-y"
          : "grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4",
      )}
    >
      {stats.map((stat) => (
        <div key={stat.title} className="flex flex-col justify-center gap-1 px-5 py-4">
          <dt className="text-[13px] text-muted-foreground">{stat.title}</dt>
          <dd className={cn("font-serif text-[30px] leading-tight font-semibold tabular-nums", toneClass[stat.tone])}>
            {stat.value}
            {stat.unit && (
              <span className="ml-0.5 text-base font-normal text-muted-foreground">
                {stat.unit}
              </span>
            )}
          </dd>
          <dd className="text-[13px] text-muted-foreground">{stat.description}</dd>
        </div>
      ))}
    </dl>
  );
};
