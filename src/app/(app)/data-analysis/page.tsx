"use client"; // Assuming client-side interactions might be added later

import React, { useCallback, useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart2,
  Filter,
  Target,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import {
  dashboardTranslations,
  DashboardTranslationKeys,
  ITEMS_PER_PAGE,
} from "@/components/business/dashboard/types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/components/business/dashboard/utils";
import { CompactHashtagFilter } from "@/components/ui/compact-hashtag-filter";

import dynamic from "next/dynamic";
import { CHART_COLORS } from "@/components/business/analysis/chart-colors";

// recharts is the bulk of this page's JavaScript; load it after the page shell.
const chartPlaceholder = () => <div className="h-full animate-pulse rounded-md bg-muted/40" />;
const StatusPieChart = dynamic(
  () => import("@/components/business/analysis/AnalysisCharts").then((m) => m.StatusPieChart),
  { ssr: false, loading: chartPlaceholder },
);
const TrendLineChart = dynamic(
  () => import("@/components/business/analysis/AnalysisCharts").then((m) => m.TrendLineChart),
  { ssr: false, loading: chartPlaceholder },
);
import { cn } from "@/lib/utils/utils";
import { SkeletonStatStrip, SkeletonTable } from "@/components/common/PageSkeletons";
import { Skeleton } from "@/components/ui/skeleton";

// 添加进度条动画样式
const progressAnimationStyle = `
  @keyframes progressFill {
    from {
      transform: scaleX(0);
      opacity: 0;
    }
    to {
      transform: scaleX(1);
      opacity: 1;
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .trend-item {
    animation: fadeInUp 0.3s ease-out both;
  }
`;




// 数据接口定义
interface ExecutionRecord {
  _id: string;
  scriptId: string;
  statusType: "success" | "failed" | "attention_needed";
  executionMessage: string;
  findings: string;
  createdAt: string;
  executionTime?: number;
}

interface ScriptAnalytics {
  scriptId: string;
  scriptName: string;
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  attentionCount: number;
  successRate: number;
  avgExecutionTime: number;
  lastExecution: string;
}

interface AnalyticsData {
  totalExecutions: number;
  totalScripts: number;
  overallSuccessRate: number;
  dailyTrend: Array<{
    date: string;
    executions: number;
    successes: number;
    failures: number;
  }>;
  scriptAnalytics: ScriptAnalytics[];
  statusDistribution: {
    success: number;
    failed: number;
    attention_needed: number;
  };
}

// 时间范围选项
const TIME_RANGES = {
  "7d": { label: "last7Days", days: 7 },
  "30d": { label: "last30Days", days: 30 },
  "90d": { label: "last90Days", days: 90 },
  all: { label: "allTime", days: null },
};

export default function DataAnalysisPage() {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null,
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState("7d");
  const [selectedScript, setSelectedScript] = useState<string>("all");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const [availableScripts, setAvailableScripts] = useState<{ scriptId: string; hashtags?: string[] }[]>([]);

  const t = useCallback(
    (key: DashboardTranslationKeys | string): string => {
      const langTranslations =
        dashboardTranslations[language] || dashboardTranslations.en;
      return (langTranslations as Record<string, string>)[key] || key;
    },
    [language],
  );

  // 生成日趋势数据
  const generateDailyTrend = useCallback((executions: ExecutionRecord[]) => {
    const dailyMap = new Map();

    executions.forEach((execution) => {
      const date = new Date(execution.createdAt).toISOString().split("T")[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, executions: 0, successes: 0, failures: 0 });
      }

      const day = dailyMap.get(date);
      day.executions++;
      if (execution.statusType === "success") {
        day.successes++;
      } else {
        day.failures++;
      }
    });

    return Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }, []);

  // 生成脚本分析数据
  const generateScriptAnalytics = useCallback(
    (
      executions: ExecutionRecord[],
      scripts: Record<string, unknown>[],
    ): ScriptAnalytics[] => {
      const scriptMap = new Map();

      scripts.forEach((script: Record<string, unknown>) => {
        const scriptId = script.scriptId as string;
        const scriptName = script.name as string;
        scriptMap.set(scriptId, {
          scriptId,
          scriptName: scriptName || scriptId,
          totalExecutions: 0,
          successCount: 0,
          failedCount: 0,
          attentionCount: 0,
          successRate: 0,
          avgExecutionTime: 0,
          lastExecution: "",
        });
      });

      executions.forEach((execution) => {
        if (scriptMap.has(execution.scriptId)) {
          const analytics = scriptMap.get(execution.scriptId);
          analytics.totalExecutions++;

          switch (execution.statusType) {
            case "success":
              analytics.successCount++;
              break;
            case "failed":
              analytics.failedCount++;
              break;
            case "attention_needed":
              analytics.attentionCount++;
              break;
          }

          if (
            !analytics.lastExecution ||
            execution.createdAt > analytics.lastExecution
          ) {
            analytics.lastExecution = execution.createdAt;
          }
        }
      });

      return Array.from(scriptMap.values())
        .map((analytics) => ({
          ...analytics,
          successRate:
            analytics.totalExecutions > 0
              ? (analytics.successCount / analytics.totalExecutions) * 100
              : 0,
        }))
        .sort((a, b) => b.totalExecutions - a.totalExecutions);
    },
    [],
  );

  // 数据处理函数
  const processAnalyticsData = useCallback(
    (
      executions: ExecutionRecord[],
      scripts: Record<string, unknown>[],
    ): AnalyticsData => {
      // 状态分布统计
      const statusDistribution = {
        success: executions.filter((e) => e.statusType === "success").length,
        failed: executions.filter((e) => e.statusType === "failed").length,
        attention_needed: executions.filter(
          (e) => e.statusType === "attention_needed",
        ).length,
      };

      // 按日期分组的趋势数据
      const dailyTrend = generateDailyTrend(executions);

      // 脚本分析数据
      const scriptAnalytics = generateScriptAnalytics(executions, scripts);

      const totalExecutions = executions.length;
      const successCount = statusDistribution.success;
      const overallSuccessRate =
        totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0;

      return {
        totalExecutions,
        totalScripts: scripts.length,
        overallSuccessRate,
        dailyTrend,
        scriptAnalytics,
        statusDistribution,
      };
    },
    [generateDailyTrend, generateScriptAnalytics],
  );

  // 获取分析数据
  const fetchAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const timeRange =
        TIME_RANGES[selectedTimeRange as keyof typeof TIME_RANGES];
      const params = new URLSearchParams();

      if (timeRange.days) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - timeRange.days);
        params.append("startDate", startDate.toISOString());
        params.append("endDate", endDate.toISOString());
      }

      if (selectedScript !== "all") {
        params.append("scriptId", selectedScript);
      }

      const [executionsResponse, scriptsResponse] = await Promise.all([
        fetch(`/api/execution-history?${params.toString()}`),
        fetch("/api/scripts"),
      ]);

      if (!executionsResponse.ok || !scriptsResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const executions: ExecutionRecord[] = await executionsResponse.json();
      const scripts = await scriptsResponse.json();
      
      // 保存脚本数据供hashtag筛选使用
      setAvailableScripts(scripts);

      // 根据hashtag筛选执行记录
      let filteredExecutions = executions;
      if (selectedHashtags.length > 0) {
        filteredExecutions = executions.filter((execution) => {
          const script = scripts.find((s: { scriptId: string; hashtags?: string[] }) => s.scriptId === execution.scriptId);
          if (!script || !script.hashtags || script.hashtags.length === 0) return false;
          // 检查脚本是否包含所有选中的hashtag
          return selectedHashtags.every((tag: string) => script.hashtags?.includes(tag));
        });
      }

      // 处理数据分析
      const processedAnalytics = processAnalyticsData(filteredExecutions, scripts);
      setAnalyticsData(processedAnalytics);
      
    } catch (err) {
      console.error("Failed to fetch analytics data:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimeRange, selectedScript, selectedHashtags, processAnalyticsData]);

  // 页面跳转相关函数
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    const totalPages = Math.ceil((analyticsData?.scriptAnalytics.length || 0) / ITEMS_PER_PAGE);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput(""); // 清空输入框
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handlePageInputSubmit(e);
    }
    // 限制只能输入数字
    if (
      !/[\d\b]/.test(e.key) &&
      !["ArrowLeft", "ArrowRight", "Delete", "Backspace", "Tab"].includes(e.key)
    ) {
      e.preventDefault();
    }
  };

  // 格式化分页信息
  const formatPageInfo = (totalScripts: number) => {
    const totalPages = Math.ceil(totalScripts / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, totalScripts);
    return t("pageInfo")
      .replace("%s", String(start))
      .replace("%s", String(end))
      .replace("%s", String(totalScripts))
      .replace("%s", String(currentPage))
      .replace("%s", String(totalPages));
  };

  // 计算当前激活的筛选条件数量
  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (selectedTimeRange !== '7d') count++; // 默认是7天，如果不是7天就算作筛选
    if (selectedScript !== 'all') count++;
    if (selectedHashtags.length > 0) count++;
    return count;
  }, [selectedTimeRange, selectedScript, selectedHashtags]);

  // 重置所有筛选条件
  const resetFilters = useCallback(() => {
    setSelectedTimeRange('7d');
    setSelectedScript('all');
    setSelectedHashtags([]);
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // 当筛选条件变化时重置分页
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTimeRange, selectedScript, selectedHashtags]);

  // 计算可用的hashtag（从脚本列表中提取）
  const availableHashtags = useMemo(() => {
    const hashtagSet = new Set<string>();
    availableScripts.forEach((script) => {
      if (script.hashtags && Array.isArray(script.hashtags)) {
        script.hashtags.forEach((tag: string) => hashtagSet.add(tag));
      }
    });
    return Array.from(hashtagSet).sort();
  }, [availableScripts]);

  return (
    <div className="min-h-screen bg-background">
      {/* 注入样式 */}
      <style dangerouslySetInnerHTML={{ __html: progressAnimationStyle }} />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="space-y-8">
            {/* 简化的Header Section - 与主页风格统一 */}
            <header className="">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <h1 className="text-[28px] leading-tight font-semibold">
                    {t("dataAnalysisTitle")}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {t("dataAnalysisSubTitle")}
                  </p>
                </div>


              </div>
            </header>

            {/* 筛选控制 - 优化展示逻辑 */}
            <Card className="relative overflow-hidden gap-0 py-0">

              <CardHeader className="relative border-b px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <CardTitle>
                        {t("filterConditions")}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {language === "zh"
                          ? getActiveFiltersCount() > 0
                            ? `已应用 ${getActiveFiltersCount()} 个筛选条件`
                            : "选择筛选条件以缩小数据范围"
                          : getActiveFiltersCount() > 0
                            ? `${getActiveFiltersCount()} filters applied`
                            : "Choose filters to narrow the data"}
                      </p>
                    </div>
                  </div>
                  
                  {/* 快速重置按钮 */}
                  {getActiveFiltersCount() > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetFilters}
                      className="text-xs opacity-70 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        重置筛选
                      </div>
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="relative px-6 py-6">
                {/* 响应式网格布局 - 根据内容自适应 */}
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {/* 时间范围筛选器 */}
                  <div className="space-y-3 min-w-0">
                    <Label
                      htmlFor="time-range"
                      className="text-sm font-semibold text-foreground flex items-center gap-2"
                    >
                      <BarChart2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="truncate">{t("timeRangeFilter")}</span>
                      {selectedTimeRange !== '7d' && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          已设置
                        </Badge>
                      )}
                    </Label>
                    <Select
                      value={selectedTimeRange}
                      onValueChange={setSelectedTimeRange}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIME_RANGES).map(([key, range]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {t(range.label)}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 脚本筛选器 */}
                  <div className="space-y-3 min-w-0">
                    <Label
                      htmlFor="script-filter"
                      className="text-sm font-semibold text-foreground flex items-center gap-2"
                    >
                      <Target className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="truncate">{t("scriptFilter")}</span>
                      {selectedScript !== 'all' && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          已选择
                        </Badge>
                      )}
                    </Label>
                    <Select
                      value={selectedScript}
                      onValueChange={setSelectedScript}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue className="truncate">
                          {selectedScript === 'all' 
                            ? t("allScripts")
                            : (() => {
                                const script = analyticsData?.scriptAnalytics.find(s => s.scriptId === selectedScript);
                                const displayName = script?.scriptName || selectedScript;
                                return displayName.length > 30 
                                  ? `${displayName.substring(0, 30)}...`
                                  : displayName;
                              })()
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-w-[400px]">
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded border border-muted-foreground"></div>
                            {t("allScripts")}
                          </div>
                        </SelectItem>
                        {analyticsData?.scriptAnalytics.map((script) => (
                          <SelectItem
                            key={script.scriptId}
                            value={script.scriptId}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <div className="h-4 w-4 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                                <div className="h-2 w-2 rounded bg-primary"></div>
                              </div>
                              <span 
                                className="truncate flex-1 text-left" 
                                title={script.scriptName}
                                style={{ maxWidth: '280px' }}
                              >
                                {script.scriptName}
                              </span>
                              <Badge variant="outline" className="text-xs ml-auto flex-shrink-0">
                                {script.totalExecutions}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 标签筛选器 - 更智能的显示逻辑 */}
                  {availableHashtags.length > 0 ? (
                    <div className="space-y-3 min-w-0 md:col-span-2 xl:col-span-1">
                      <Label
                        htmlFor="tag-filter"
                        className="text-sm font-semibold text-foreground flex items-center gap-2"
                      >
                        <Filter className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="truncate">{t("tagFilterButton")}</span>
                        {selectedHashtags.length > 0 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                            {selectedHashtags.length} 个标签
                          </Badge>
                        )}
                      </Label>
                      <CompactHashtagFilter
                        availableHashtags={availableHashtags}
                        selectedHashtags={selectedHashtags}
                        onHashtagsChange={(hashtags) => {
                          setSelectedHashtags(hashtags);
                          setCurrentPage(1); // 重置分页
                        }}
                        className="w-full h-12"
                      />
                    </div>
                  ) : (
                    // 如果没有hashtag，显示占位符或其他内容
                    <div className="space-y-3 min-w-0 md:col-span-2 xl:col-span-1">
                      <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Filter className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">标签筛选</span>
                      </Label>
                      <div className="h-12 border border-dashed border-border/30 rounded-md flex items-center justify-center text-sm text-muted-foreground bg-muted/10">
                        暂无可用标签
                      </div>
                    </div>
                  )}
                </div>

                {/* 当前筛选状态指示器 */}
                {getActiveFiltersCount() > 0 && (
                  <div className="mt-6 pt-4 border-t border-border/20">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">当前筛选:</span>
                      
                      {selectedTimeRange !== 'last7days' && (
                        <Badge variant="outline" className="text-xs">
                          时间: {t(TIME_RANGES[selectedTimeRange as keyof typeof TIME_RANGES].label)}
                        </Badge>
                      )}
                      
                      {selectedScript !== 'all' && (
                        <Badge variant="outline" className="text-xs">
                          脚本: {analyticsData?.scriptAnalytics.find(s => s.scriptId === selectedScript)?.scriptName || selectedScript}
                        </Badge>
                      )}
                      
                      {selectedHashtags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {analyticsData && (
              <dl className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1 bg-card px-5 py-4">
                  <dt className="text-[13px] text-muted-foreground">{t("totalExecutions")}</dt>
                  <dd className="font-serif text-[30px] leading-tight font-semibold tabular-nums">
                    {analyticsData.totalExecutions.toLocaleString()}
                  </dd>
                  <dd className="text-[13px] text-muted-foreground">
                    {analyticsData.totalScripts} {t("scriptsCount")}
                  </dd>
                </div>
                <div className="space-y-1 bg-card px-5 py-4">
                  <dt className="text-[13px] text-muted-foreground">{t("overallSuccessRate")}</dt>
                  <dd
                    className={cn(
                      "font-serif text-[30px] leading-tight font-semibold tabular-nums",
                      analyticsData.overallSuccessRate >= 80 ? "text-success" : "text-attention",
                    )}
                  >
                    {analyticsData.overallSuccessRate.toFixed(1)}
                    <span className="ml-0.5 text-base font-normal text-muted-foreground">%</span>
                  </dd>
                  <dd className="pt-1">
                    <Progress value={analyticsData.overallSuccessRate} className="h-1" />
                  </dd>
                </div>
                <div className="space-y-1 bg-card px-5 py-4">
                  <dt className="text-[13px] text-muted-foreground">{t("successfulExecutions")}</dt>
                  <dd className="font-serif text-[30px] leading-tight font-semibold text-success tabular-nums">
                    {analyticsData.statusDistribution.success.toLocaleString()}
                  </dd>
                  <dd className="text-[13px] text-muted-foreground">
                    {(
                      (analyticsData.statusDistribution.success / analyticsData.totalExecutions) *
                      100
                    ).toFixed(1)}
                    % {t("of")} {t("totalExecutions")}
                  </dd>
                </div>
                <div className="space-y-1 bg-card px-5 py-4">
                  <dt className="text-[13px] text-muted-foreground">{t("failedAttentionExecutions")}</dt>
                  <dd className="font-serif text-[30px] leading-tight font-semibold text-attention tabular-nums">
                    {(
                      analyticsData.statusDistribution.failed +
                      analyticsData.statusDistribution.attention_needed
                    ).toLocaleString()}
                  </dd>
                  <dd className="flex gap-3 text-[13px]">
                    <span className="text-failure">
                      {analyticsData.statusDistribution.failed} {t("failedLabel")}
                    </span>
                    <span className="text-attention">
                      {analyticsData.statusDistribution.attention_needed} {t("attentionLabel")}
                    </span>
                  </dd>
                </div>
              </dl>
            )}

            {/* 可视化图表区域 */}
            {analyticsData && (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* 状态分布饼状图 */}
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
                        success={analyticsData.statusDistribution.success}
                        failed={analyticsData.statusDistribution.failed}
                        attention={analyticsData.statusDistribution.attention_needed}
                        labels={{ success: t("successLabel"), failed: t("failedLabel"), attention: t("attentionLabel") }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 趋势折线图 */}
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
                        data={analyticsData.dailyTrend.slice(-14)}
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
            )}



            {/* 趋势图表 */}
            {analyticsData && analyticsData.dailyTrend.length > 0 && (
              <Card className="relative overflow-hidden gap-0 py-0">

                <CardHeader className="relative border-b px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="space-y-2">
                      <CardTitle>
                        {language === "zh" ? "每日明细" : "Daily breakdown"}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="relative px-6 py-6">
                  <div className="space-y-3">
                    {analyticsData.dailyTrend
                      .slice(-14)
                      .reverse()
                      .map((day, index) => {
                        const successRate =
                          day.executions > 0
                            ? (day.successes / day.executions) * 100
                            : 0;

                        return (
                          <div
                            key={day.date}
                            className="trend-item group/item relative overflow-hidden rounded-lg p-4 transition-all duration-300 border border-border/30 hover:border-border/50  "
                            style={{ animationDelay: `${index * 0.1}s` }}
                          >
                            {/* 装饰性渐变背景 */}
                            <div className="absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />

                            <div className="relative flex items-center gap-4">
                              {/* 日期卡片 - 统一样式 */}
                              <div className="flex-none">
                                <div className="w-16 h-14 rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all duration-300 group-hover/ text-muted-foreground border border-border/40 hover:border-border/60">
                                  <div className="font-mono font-bold text-sm">
                                    {formatDate(day.date, language)
                                      .split(" ")[0]
                                      .split("-")[2] ||
                                      formatDate(day.date, language)
                                        .split(" ")[0]
                                        .split("/")[1]}
                                  </div>
                                  <div className="text-[10px] opacity-80 font-medium">
                                    {formatDate(day.date, language)
                                      .split(" ")[0]
                                      .split("-")[1] ||
                                      formatDate(day.date, language)
                                        .split(" ")[0]
                                        .split("/")[0]}
                                    月
                                  </div>
                                </div>
                              </div>

                              {/* 主要内容区域 */}
                              <div className="flex-1 min-w-0 space-y-3">
                                {/* 顶部信息行 */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-foreground">
                                      {day.executions} {t("executionsLabel")}
                                    </span>
                                    {day.executions > 0 && (
                                      <Badge
                                        variant="outline"
                                        className={`text-xs font-medium px-3 py-1 transition-all duration-300  ${
                                          successRate >= 95
                                            ? "border-success/30 text-success       "
                                            : successRate >= 85
                                              ? "border-border text-foreground       "
                                              : successRate >= 70
                                                ? "border-attention/30 text-attention       "
                                                : "border-failure/30 text-failure       "
                                        }`}
                                      >
                                        {successRate.toFixed(1)}%
                                      </Badge>
                                    )}
                                  </div>

                                  {/* 统计数字 */}
                                  <div className="flex items-center gap-3 text-xs font-medium">
                                                                          <div className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors"
                                           style={{ backgroundColor: CHART_COLORS.lightGreen }}>
                                        <div className="w-2.5 h-2.5 rounded-full "
                                             style={{ background: `linear-gradient(to bottom right, ${CHART_COLORS.chartGreen}, ${CHART_COLORS.success})` }}></div>
                                        <span className="font-semibold"
                                              style={{ color: CHART_COLORS.chartGreen }}>
                                          {day.successes}
                                        </span>
                                      </div>
                                      {day.failures > 0 && (
                                        <div className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors"
                                             style={{ backgroundColor: CHART_COLORS.lightRed }}>
                                          <div className="w-2.5 h-2.5 rounded-full "
                                               style={{ background: `linear-gradient(to bottom right, ${CHART_COLORS.chartRed}, ${CHART_COLORS.failed})` }}></div>
                                          <span className="font-semibold"
                                                style={{ color: CHART_COLORS.chartRed }}>
                                            {day.failures}
                                          </span>
                                        </div>
                                      )}
                                  </div>
                                </div>

                                {/* 进度条 */}
                                <div className="relative">
                                  <div className="h-4 rounded-full overflow-hidden border border-border ">
                                    {day.executions > 0 && (
                                      <>
                                        {/* 成功部分 */}
                                        <div
                                          className="absolute left-0 top-0 h-full transition-all duration-700 ease-out relative overflow-hidden"
                                          style={{
                                            background: `linear-gradient(to right, ${CHART_COLORS.chartGreen}, ${CHART_COLORS.success})`,
                                            width: `${(day.successes / day.executions) * 100}%`,
                                            animation: `progressFill 1s ease-out ${index * 0.1}s both`,
                                          }}
                                        >
                                          {/* 内部光效 */}
                                          <div className="absolute inset-0    "></div>
                                        </div>
                                        {/* 失败部分 */}
                                        {day.failures > 0 && (
                                          <div
                                            className="absolute top-0 h-full transition-all duration-700 ease-out relative overflow-hidden"
                                            style={{
                                              background: `linear-gradient(to right, ${CHART_COLORS.chartRed}, ${CHART_COLORS.failed})`,
                                              left: `${(day.successes / day.executions) * 100}%`,
                                              width: `${(day.failures / day.executions) * 100}%`,
                                              animation: `progressFill 1s ease-out ${index * 0.1 + 0.3}s both`,
                                            }}
                                          >
                                            {/* 内部光效 */}
                                            <div className="absolute inset-0    "></div>
                                          </div>
                                        )}

                                        {/* 顶部发光效果 */}
                                        <div className="absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-500"></div>
                                      </>
                                    )}
                                  </div>

                                  {/* 动态光线扫过效果 */}
                                  <div className="absolute inset-0 h-4 rounded-full opacity-0 group-hover/item:opacity-100 transition-all duration-700 transform -skew-x-12 group-hover/item:animate-pulse"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 脚本性能分析 - 与主页风格统一 */}
            {analyticsData && analyticsData.scriptAnalytics.length > 0 && (
              <Card className="relative overflow-hidden gap-0 py-0">

                <CardHeader className="relative border-b px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="space-y-2">
                      <CardTitle>
                        {t("scriptPerformanceAnalysis")}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b text-[13px] text-muted-foreground">
                          <th className="h-10 px-6 text-left font-normal">{language === "zh" ? "脚本" : "Script"}</th>
                          <th className="h-10 w-20 px-4 text-right font-normal">{t("executionsLabel")}</th>
                          <th className="h-10 w-20 px-4 text-right font-normal">{t("successLabel")}</th>
                          <th className="h-10 w-20 px-4 text-right font-normal">{t("attentionLabel")}</th>
                          <th className="h-10 w-20 px-4 text-right font-normal">{t("failedLabel")}</th>
                          <th className="h-10 w-48 px-4 text-left font-normal">{t("successRateLabel")}</th>
                          <th className="h-10 w-56 px-6 text-right font-normal">{t("lastExecution")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {analyticsData.scriptAnalytics
                          .sort((a, b) => {
                            // Pass rate first, then run count for near-equal rates.
                            if (Math.abs(a.successRate - b.successRate) < 0.1) {
                              return b.totalExecutions - a.totalExecutions;
                            }
                            return b.successRate - a.successRate;
                          })
                          .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                          .map((script) => (
                            <tr key={script.scriptId} className="hover:bg-muted/40">
                              <td className="max-w-0 px-6 py-3">
                                <p className="truncate font-medium" title={script.scriptName}>
                                  {script.scriptName}
                                </p>
                                <p className="truncate font-mono text-[12px] text-muted-foreground">
                                  {script.scriptId}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums">{script.totalExecutions}</td>
                              <td className={cn("px-4 py-3 text-right tabular-nums", script.successCount ? "text-success" : "text-muted-foreground")}>{script.successCount}</td>
                              <td className={cn("px-4 py-3 text-right tabular-nums", script.attentionCount ? "text-attention" : "text-muted-foreground")}>{script.attentionCount}</td>
                              <td className={cn("px-4 py-3 text-right tabular-nums", script.failedCount ? "text-failure" : "text-muted-foreground")}>{script.failedCount}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                    <div
                                      className={cn(
                                        "h-full rounded-full",
                                        script.successRate >= 80 ? "bg-success" : script.successRate > 0 ? "bg-attention" : "bg-failure",
                                      )}
                                      style={{ width: `${Math.max(script.successRate, 2)}%` }}
                                    />
                                  </div>
                                  <span className="w-12 text-right text-[13px] tabular-nums">
                                    {script.successRate.toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-right text-[13px] whitespace-nowrap text-muted-foreground tabular-nums">
                                {script.lastExecution ? formatDate(script.lastExecution, language) : "—"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>

                {/* 分页 - 与其他页面保持一致 */}
                {analyticsData && analyticsData.scriptAnalytics.length > ITEMS_PER_PAGE && (
                  <CardFooter className="flex flex-col sm:flex-row items-center justify-between border-t px-5 py-3 text-xs gap-2 relative z-10">
                    <div className="text-muted-foreground text-center sm:text-left">
                      {formatPageInfo(analyticsData.scriptAnalytics.length)}
                    </div>
                    <div className="flex items-center gap-2 relative z-20">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                        disabled={currentPage === 1}
                        className="h-7 px-2 text-xs transition-all duration-150 relative z-30"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                        <span className="hidden sm:inline">{t("previous")}</span>
                      </Button>

                      <div className="flex items-center gap-1.5 px-2 relative z-30">
                        {(() => {
                          const totalPages = Math.ceil(analyticsData.scriptAnalytics.length / ITEMS_PER_PAGE);
                          return (
                            <>
                              <div className="hidden md:flex items-center gap-1">
                                {currentPage > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCurrentPage(1)}
                                    className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground relative z-40"
                                    title={t("jumpToFirst")}
                                  >
                                    1
                                  </Button>
                                )}
                                {currentPage > 3 && (
                                  <span className="text-muted-foreground">...</span>
                                )}
                              </div>

                              <span className="text-muted-foreground text-xs">
                                {t("pageNumber")}
                              </span>
                              <span className="font-medium text-xs min-w-[1.5rem] text-center">
                                {currentPage}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {t("of")} {totalPages} {t("pages")}
                              </span>

                              <div className="hidden md:flex items-center gap-1">
                                {currentPage < totalPages - 2 && (
                                  <span className="text-muted-foreground">...</span>
                                )}
                                {currentPage < totalPages && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCurrentPage(totalPages)}
                                    className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground relative z-40"
                                    title={t("jumpToLast")}
                                  >
                                    {totalPages}
                                  </Button>
                                )}
                              </div>

                              {totalPages > 2 && (
                                <div className="hidden lg:flex items-center gap-1 ml-2 relative z-40">
                                  <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                                  <form
                                    onSubmit={handlePageInputSubmit}
                                    className="flex items-center gap-1"
                                  >
                                    <input
                                      type="number"
                                      min="1"
                                      max={totalPages}
                                      value={pageInput}
                                      onChange={handlePageInputChange}
                                      onKeyDown={handlePageInputKeyDown}
                                      placeholder={t("jumpToPage")}
                                      className="w-12 h-6 px-1 text-xs text-center border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring relative z-50"
                                      style={{ pointerEvents: "auto" }}
                                    />
                                    <Button
                                      type="submit"
                                      variant="outline"
                                      size="sm"
                                      disabled={
                                        !pageInput ||
                                        isNaN(parseInt(pageInput, 10)) ||
                                        parseInt(pageInput, 10) < 1 ||
                                        parseInt(pageInput, 10) > totalPages
                                      }
                                      className="h-6 px-2 text-xs relative z-50"
                                      title={t("pageJump")}
                                      style={{ pointerEvents: "auto" }}
                                    >
                                      {t("pageJump")}
                                    </Button>
                                  </form>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const totalPages = Math.ceil(analyticsData.scriptAnalytics.length / ITEMS_PER_PAGE);
                          setCurrentPage(Math.min(currentPage + 1, totalPages));
                        }}
                        disabled={currentPage === Math.ceil(analyticsData.scriptAnalytics.length / ITEMS_PER_PAGE)}
                        className="h-7 px-2 text-xs transition-all duration-150 relative z-30"
                      >
                        <span className="hidden sm:inline">{t("next")}</span>
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </CardFooter>
                )}
              </Card>
            )}

            {/* 加载状态 */}
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

            {/* 错误状态 */}
            {error && (
              <Card className="border border-failure/30 bg-failure/10 gap-0 py-0">
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-failure" />
                  <p className="text-lg font-medium text-failure mb-2">
                    {t("dataLoadFailed")}
                  </p>
                  <p className="text-sm text-failure mb-4">
                    {error}
                  </p>

                </CardContent>
              </Card>
            )}

            {/* 无数据状态 */}
            {!isLoading &&
              !error &&
              analyticsData &&
              analyticsData.totalExecutions === 0 && (
                <Card className="border border-border/20 gap-0 py-0">
                  <CardContent className="p-12 text-center">
                    <BarChart2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-lg font-medium text-muted-foreground mb-2">
                      {t("noData")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("noDataInTimeRange")}
                    </p>
                  </CardContent>
                </Card>
              )}
          </div>
        </div>
      </div>

      {/* 版本号显示 - 与主页风格统一 */}
      <div className="fixed left-6 bottom-6 z-50">
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/40 transition-all duration-300">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span className="font-mono text-xs text-muted-foreground font-medium">
            v{process.env.NEXT_PUBLIC_APP_VERSION || "0.1.9"}
          </span>
        </div>
      </div>
    </div>
  );
}
