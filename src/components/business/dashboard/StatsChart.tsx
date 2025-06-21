import React from "react";
import {
  BarChart2,
  ArrowUpRight,
  Percent,
  Calendar,
  Info,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardTranslationKeys } from "./types";

interface StatsChartProps {
  successCount: number;
  failureCount: number;
  allChecksCount: number;
  successRate: number;
  todayChecks: number;
  yesterdayChecks: number;
  t: (key: DashboardTranslationKeys) => string;
}

export const StatsChart: React.FC<StatsChartProps> = ({
  successCount,
  failureCount,
  todayChecks,
  yesterdayChecks,
  t,
}) => {
  // 计算柱状图的高度比例
  const maxValue = Math.max(successCount, failureCount);
  const successHeight = maxValue > 0 ? (successCount / maxValue) * 100 : 0;
  const failureHeight = maxValue > 0 ? (failureCount / maxValue) * 100 : 0;

  // 样式属性
  const barSuccessStyle = {
    height: `${successHeight}%`,
    backgroundColor: "var(--chart-2)",
    transition: "height 0.5s ease-out",
  };

  const barFailureStyle = {
    height: `${failureHeight}%`,
    backgroundColor: "var(--chart-5)",
    transition: "height 0.5s ease-out",
  };

  // 计算成功率
  const total = successCount + failureCount;
  const successRateValue =
    total > 0 ? Math.round((successCount / total) * 100) : 0;

  // 计算与昨天相比的增长率
  const growthRate =
    yesterdayChecks > 0
      ? Math.round(((todayChecks - yesterdayChecks) / yesterdayChecks) * 100)
      : 0;

  return (
    <Card className="unified-card shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
      <CardHeader className="px-4 py-3 bg-card/50 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="icon-container bg-primary/10 rounded-lg">
            <BarChart2 className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>{t("checksStatistics")}</CardTitle>
        </div>
        <CardDescription className="mt-1">
          {t("checkPerformanceOverview")}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-2 flex-1 flex flex-col">
        <div className="flex flex-col gap-4 flex-1">
          {/* 顶部信息栏 */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-card/30 border border-border/30 rounded-md p-2">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{t("today")}</span>
              </div>
              <p className="font-semibold">{todayChecks}</p>
            </div>
            <div className="bg-card/30 border border-border/30 rounded-md p-2">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <Percent className="h-3.5 w-3.5" />
                <span>{t("successRate")}</span>
              </div>
              <p className="font-semibold">{successRateValue}%</p>
            </div>
            <div className="bg-card/30 border border-border/30 rounded-md p-2">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>{t("checksDistribution")}</span>
              </div>
              <p
                className={`font-semibold ${growthRate >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {growthRate >= 0 ? "+" : ""}
                {growthRate}%
              </p>
            </div>
          </div>

          {/* 图表显示区域 */}
          <div className="rounded-md border border-border/30 bg-card/30 p-4 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-medium">{t("checksDistribution")}</h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[var(--chart-2)]"></span>
                  <span>{t("filterSuccess")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[var(--chart-5)]"></span>
                  <span>{t("filterFailed")}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end h-28 gap-4 mb-2 mt-2 flex-1">
              <div className="flex flex-col items-center justify-end flex-1">
                <div
                  className="relative w-full rounded-t-md overflow-hidden flex justify-center items-end"
                  style={{ minHeight: "80px" }}
                >
                  <div
                    className="w-2/5 rounded-t-md relative"
                    style={barSuccessStyle}
                  >
                    <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium flex items-center">
                      <CheckCircle className="h-3 w-3 text-green-500 mr-0.5" />
                      {successCount}
                    </span>
                  </div>
                </div>
                <div className="w-full pt-1 text-center border-t border-border/30 mt-1">
                  <span className="text-xs font-medium">
                    {successRateValue}%
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-end flex-1">
                <div
                  className="relative w-full rounded-t-md overflow-hidden flex justify-center items-end"
                  style={{ minHeight: "80px" }}
                >
                  <div
                    className="w-2/5 rounded-t-md relative"
                    style={barFailureStyle}
                  >
                    <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium flex items-center">
                      <XCircle className="h-3 w-3 text-red-500 mr-0.5" />
                      {failureCount}
                    </span>
                  </div>
                </div>
                <div className="w-full pt-1 text-center border-t border-border/30 mt-1">
                  <span className="text-xs font-medium">
                    {100 - successRateValue}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>
                {t("totalChecks")}: {successCount + failureCount}
              </span>
            </div>
          </div>

          {/* 日期比较 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border/30 bg-card/30 p-3">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t("today")}</p>
                  <p className="text-lg font-semibold">{todayChecks}</p>
                </div>
                <div className="flex items-center justify-center h-8 w-8 bg-primary/5 rounded-full">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
              </div>
            </div>
            <div className="rounded-md border border-border/30 bg-card/30 p-3">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("yesterday")}
                  </p>
                  <p className="text-lg font-semibold">{yesterdayChecks}</p>
                  {growthRate !== 0 && (
                    <p
                      className={`text-xs ${growthRate >= 0 ? "text-green-500" : "text-red-500"}`}
                    >
                      {growthRate >= 0 ? "↑" : "↓"} {Math.abs(growthRate)}%
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-center h-8 w-8 bg-primary/5 rounded-full">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
