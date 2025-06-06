"use client"; // Assuming client-side interactions might be added later

import React, { useCallback, useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart2,
  Filter,
  TrendingUp,
  Activity,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  PieChart,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  dashboardTranslations,
  DashboardTranslationKeys,
  ITEMS_PER_PAGE,
} from "@/components/dashboard/types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/components/dashboard/utils";
import UserHeader from "@/components/UserHeader";
import { CompactHashtagFilter } from "@/components/ui/compact-hashtag-filter";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,

} from "recharts";

// 添加进度条动画样式
const progressAnimationStyle = `
  @keyframes progressFill {
    from {
      width: 0;
      transform: scaleX(0);
      opacity: 0;
    }
    to {
      transform: scaleX(1);
      opacity: 1;
    }
  }
  
  @keyframes shimmer {
    0% {
      transform: translateX(-100%) skewX(-12deg);
    }
    100% {
      transform: translateX(200%) skewX(-12deg);
    }
  }
  
  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
    }
    50% {
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.3);
    }
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes bounceIn {
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    50% {
      transform: scale(1.05);
    }
    70% {
      transform: scale(0.9);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  .trend-item {
    animation: fadeInUp 0.6s ease-out both;
  }
  
  .stat-card {
    animation: bounceIn 0.8s ease-out both;
  }
  
  .header-slide-in {
    animation: slideInLeft 0.8s ease-out both;
  }
  
  .button-slide-in {
    animation: slideInRight 0.8s ease-out both;
  }
  
  .glass-effect {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .gradient-text {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .floating-animation {
    animation: float 6s ease-in-out infinite;
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
`;

// 图表颜色配置 - 基于提供的颜色图示优化
const CHART_COLORS = {
  success: "#22c55e",        // 绿色 #22c55e - 成功 (鲜绿色)
  failed: "#ef4444",         // 红色 #ef4444 - 失败 (明亮红色)
  attention_needed: "#f59e0b", // 橙色 #f59e0b - 需要注意 (琥珀色)
  primary: "#3b82f6",        // 蓝色 #3b82f6 - 主色调 (明亮蓝色)
  secondary: "#8b5cf6",      // 紫色 #8b5cf6 - 辅助色 (深紫色)
  accent: "#06b6d4",         // 青色 #06b6d4 - 强调色 (天蓝色)
  muted: "hsl(var(--muted-foreground))", // 静音色
  border: "hsl(var(--border))",      // 边框色
  background: "hsl(var(--background))", // 背景色
  
  // 新增细分颜色
  lightBlue: "#dbeafe",      // 浅蓝色背景
  lightGreen: "#dcfce7",     // 浅绿色背景  
  lightRed: "#fee2e2",       // 浅红色背景
  lightPurple: "#f3e8ff",    // 浅紫色背景
  lightGray: "#f8fafc",      // 浅灰色背景
  
  // 图表专用色彩
  chartBlue: "#1e40af",      // 深蓝色 - 图表主色
  chartGreen: "#059669",     // 深绿色 - 成功数据  
  chartRed: "#dc2626",       // 深红色 - 错误数据
  chartPurple: "#7c3aed",    // 深紫色 - 特殊数据
  chartOrange: "#ea580c",    // 深橙色 - 警告数据
};

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

  // 获取成功率的颜色和状态
  const getSuccessRateStatus = useCallback(
    (rate: number) => {
      if (rate >= 95)
        return {
          color: "bg-green-500",
          text: "text-green-700",
          label: t("performanceExcellent"),
        };
      if (rate >= 85)
        return {
          color: "bg-blue-500",
          text: "text-blue-700",
          label: t("performanceGood"),
        };
      if (rate >= 70)
        return {
          color: "bg-yellow-500",
          text: "text-yellow-700",
          label: t("performanceAverage"),
        };
      return {
        color: "bg-red-500",
        text: "text-red-700",
        label: t("performanceNeedsAttention"),
      };
    },
    [t],
  );

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
      <UserHeader />
      {/* 注入样式 */}
      <style dangerouslySetInnerHTML={{ __html: progressAnimationStyle }} />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="space-y-8">
            {/* 简化的Header Section - 与主页风格统一 */}
            <header className="text-center lg:text-left">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="space-y-3">
                  <h1 className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent leading-tight py-1">
                    {t("dataAnalysisTitle")}
                  </h1>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {t("dataAnalysisSubTitle")}
                  </p>
                </div>


              </div>
            </header>

            {/* 筛选控制 - 优化展示逻辑 */}
            <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />

              <CardHeader className="relative px-6 py-5 border-b border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20 group-hover:ring-primary/30 transition-all duration-300">
                      <Filter className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-bold text-foreground leading-relaxed">
                        {t("filterConditions")}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {getActiveFiltersCount() > 0 
                          ? `已应用 ${getActiveFiltersCount()} 个筛选条件`
                          : "请选择筛选条件以过滤数据"
                        }
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
                      <SelectTrigger className="h-12 text-base border-2 border-border/50 bg-background/50 hover:border-primary/30 transition-colors">
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
                      <SelectTrigger className="h-12 text-base border-2 border-border/50 bg-background/50 hover:border-primary/30 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded border-2 border-muted-foreground"></div>
                            {t("allScripts")}
                          </div>
                        </SelectItem>
                        {analyticsData?.scriptAnalytics.map((script) => (
                          <SelectItem
                            key={script.scriptId}
                            value={script.scriptId}
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded bg-primary/20 flex items-center justify-center">
                                <div className="h-2 w-2 rounded bg-primary"></div>
                              </div>
                              <span className="truncate">{script.scriptName}</span>
                              <Badge variant="outline" className="text-xs ml-auto">
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
                      <div className="h-12 border-2 border-dashed border-border/30 rounded-md flex items-center justify-center text-sm text-muted-foreground bg-muted/10">
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

            {/* 概览统计卡片 - 与主页风格统一 */}
            {analyticsData && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* 总执行次数 */}
                <Card className="group relative overflow-hidden border-2 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl"
                      style={{ 
                        borderColor: `${CHART_COLORS.chartBlue}40`,
                        backgroundColor: CHART_COLORS.lightBlue
                      }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium"
                           style={{ color: CHART_COLORS.chartBlue }}>
                          {t("totalExecutions")}
                        </p>
                        <p className="text-3xl font-bold"
                           style={{ color: CHART_COLORS.chartBlue }}>
                          {analyticsData.totalExecutions.toLocaleString()}
                        </p>
                      </div>
                      <Activity className="h-8 w-8"
                                style={{ color: CHART_COLORS.chartBlue }} />
                    </div>
                    <div className="mt-4">
                      <Badge
                        variant="secondary"
                        className="font-medium"
                        style={{ 
                          backgroundColor: `${CHART_COLORS.chartBlue}20`,
                          color: CHART_COLORS.chartBlue
                        }}
                      >
                        {analyticsData.totalScripts} {t("scriptsCount")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* 整体成功率 */}
                <Card className="group relative overflow-hidden border-2 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl"
                      style={{ 
                        borderColor: `${CHART_COLORS.chartGreen}40`,
                        backgroundColor: CHART_COLORS.lightGreen
                      }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium"
                           style={{ color: CHART_COLORS.chartGreen }}>
                          {t("overallSuccessRate")}
                        </p>
                        <p className="text-3xl font-bold"
                           style={{ color: CHART_COLORS.chartGreen }}>
                          {analyticsData.overallSuccessRate.toFixed(1)}%
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8"
                                   style={{ color: CHART_COLORS.chartGreen }} />
                    </div>
                    <div className="mt-4 space-y-2">
                      <Progress
                        value={analyticsData.overallSuccessRate}
                        className="h-2"
                      />
                      <p className="text-xs"
                         style={{ color: CHART_COLORS.chartGreen }}>
                        {
                          getSuccessRateStatus(analyticsData.overallSuccessRate)
                            .label
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 成功执行 */}
                <Card className="group relative overflow-hidden border-2 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl"
                      style={{ 
                        borderColor: `${CHART_COLORS.chartPurple}40`,
                        backgroundColor: CHART_COLORS.lightPurple
                      }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium"
                           style={{ color: CHART_COLORS.chartBlue }}>
                          {t("successfulExecutions")}
                        </p>
                        <p className="text-3xl font-bold"
                           style={{ color: CHART_COLORS.chartPurple }}>
                          {analyticsData.statusDistribution.success.toLocaleString()}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8"
                                  style={{ color: CHART_COLORS.chartPurple }} />
                    </div>
                    <div className="mt-4">
                      <p className="text-xs"
                         style={{ color: CHART_COLORS.chartBlue }}>
                        {(
                          (analyticsData.statusDistribution.success /
                            analyticsData.totalExecutions) *
                          100
                        ).toFixed(1)}
                        % {t("of")} {t("totalExecutions")}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 失败/需关注 */}
                <Card className="group relative overflow-hidden border-2 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl"
                      style={{ 
                        borderColor: `${CHART_COLORS.chartRed}40`,
                        backgroundColor: CHART_COLORS.lightRed
                      }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium"
                           style={{ color: CHART_COLORS.chartRed }}>
                          {t("failedAttentionExecutions")}
                        </p>
                        <p className="text-3xl font-bold"
                           style={{ color: CHART_COLORS.chartRed }}>
                          {(
                            analyticsData.statusDistribution.failed +
                            analyticsData.statusDistribution.attention_needed
                          ).toLocaleString()}
                        </p>
                      </div>
                      <AlertTriangle className="h-8 w-8"
                                     style={{ color: CHART_COLORS.chartRed }} />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Badge variant="destructive" className="text-xs font-medium"
                             style={{ 
                               backgroundColor: CHART_COLORS.chartRed,
                               color: 'white'
                             }}>
                        {analyticsData.statusDistribution.failed}{" "}
                        {t("failedLabel")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs font-medium"
                        style={{ 
                          color: CHART_COLORS.chartOrange,
                          borderColor: CHART_COLORS.chartOrange
                        }}
                      >
                        {analyticsData.statusDistribution.attention_needed}{" "}
                        {t("attentionLabel")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 可视化图表区域 */}
            {analyticsData && (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* 状态分布饼状图 */}
                <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
                  
                  <CardHeader className="relative px-6 py-5 border-b border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20 group-hover:ring-primary/30 transition-all duration-300">
                        <PieChart className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="space-y-2">
                        <CardTitle className="text-xl font-bold text-foreground leading-relaxed">
                          {t('statusDistribution')}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{t('executionResultsStats')}</p>
                      </div>
                    </div>
                  </CardHeader>

                                    <CardContent className="relative px-6 py-6">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={[
                              { 
                                name: t('successLabel'), 
                                value: analyticsData.statusDistribution.success, 
                                color: CHART_COLORS.chartGreen,
                                percentage: ((analyticsData.statusDistribution.success / analyticsData.totalExecutions) * 100).toFixed(1)
                              },
                              { 
                                name: t('failedLabel'), 
                                value: analyticsData.statusDistribution.failed, 
                                color: CHART_COLORS.chartRed,
                                percentage: ((analyticsData.statusDistribution.failed / analyticsData.totalExecutions) * 100).toFixed(1)
                              },
                              { 
                                name: t('attentionLabel'), 
                                value: analyticsData.statusDistribution.attention_needed, 
                                color: CHART_COLORS.chartOrange,
                                percentage: ((analyticsData.statusDistribution.attention_needed / analyticsData.totalExecutions) * 100).toFixed(1)
                              }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={120}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          >
                            {[
                              { name: t('successLabel'), value: analyticsData.statusDistribution.success, color: CHART_COLORS.chartGreen },
                              { name: t('failedLabel'), value: analyticsData.statusDistribution.failed, color: CHART_COLORS.chartRed },
                              { name: t('attentionLabel'), value: analyticsData.statusDistribution.attention_needed, color: CHART_COLORS.chartOrange }
                            ].map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color}
                                className="hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number, name: string, props: { payload?: { percentage: string } }) => [
                              `${value} 次 (${props.payload?.percentage}%)`, 
                              name
                            ]}
                            contentStyle={{
                              backgroundColor: CHART_COLORS.background,
                              borderColor: CHART_COLORS.border,
                              borderRadius: '12px',
                              fontSize: '14px',
                              fontWeight: '500',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                              border: '1px solid'
                            }}
                            labelStyle={{
                              color: 'hsl(var(--foreground))',
                              fontWeight: '600'
                            }}
                          />
                          <Legend 
                            wrapperStyle={{
                              paddingTop: '20px',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* 趋势折线图 */}
                <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
                  
                  <CardHeader className="relative px-6 py-5 border-b border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20 group-hover:ring-primary/30 transition-all duration-300">
                        <TrendingUp className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="space-y-2">
                        <CardTitle className="text-xl font-bold text-foreground leading-relaxed">
                          {t('executionTrend')}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{t('recent14DaysTrend')}</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="relative px-6 py-6">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={analyticsData.dailyTrend.slice(-14)}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid 
                            strokeDasharray="2 2" 
                            stroke={CHART_COLORS.border}
                            strokeOpacity={0.3}
                          />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return `${date.getMonth() + 1}/${date.getDate()}`;
                            }}
                            stroke={CHART_COLORS.muted}
                            fontSize={12}
                            tickMargin={10}
                          />
                          <YAxis 
                            stroke={CHART_COLORS.muted}
                            fontSize={12}
                            tickMargin={10}
                          />
                          <Tooltip 
                            labelFormatter={(value) => {
                              const date = new Date(value);
                              return `${t('date')}: ${date.toLocaleDateString()}`;
                            }}
                            formatter={(value: number, name: string) => [
                              value,
                              name
                            ]}
                            contentStyle={{
                              backgroundColor: CHART_COLORS.background,
                              borderColor: CHART_COLORS.border,
                              borderRadius: '12px',
                              fontSize: '14px',
                              fontWeight: '500',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                              border: '1px solid'
                            }}
                            labelStyle={{
                              color: 'hsl(var(--foreground))',
                              fontWeight: '600',
                              marginBottom: '8px'
                            }}
                          />
                          <Legend 
                            wrapperStyle={{
                              paddingTop: '20px',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="executions" 
                            stroke={CHART_COLORS.chartBlue} 
                            strokeWidth={4}
                            name={t('totalExecutions')}
                            dot={{ 
                              fill: CHART_COLORS.chartBlue, 
                              strokeWidth: 3, 
                              r: 6,
                              className: "hover:r-8 transition-all duration-200"
                            }}
                            activeDot={{ 
                              r: 10, 
                              stroke: CHART_COLORS.chartBlue,
                              strokeWidth: 3,
                              fill: CHART_COLORS.background
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="successes" 
                            stroke={CHART_COLORS.chartGreen} 
                            strokeWidth={4}
                            name={t('successfulExecutions')}
                            dot={{ 
                              fill: CHART_COLORS.chartGreen, 
                              strokeWidth: 3, 
                              r: 6,
                              className: "hover:r-8 transition-all duration-200"
                            }}
                            activeDot={{ 
                              r: 10, 
                              stroke: CHART_COLORS.chartGreen,
                              strokeWidth: 3,
                              fill: CHART_COLORS.background
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="failures" 
                            stroke={CHART_COLORS.chartRed} 
                            strokeWidth={4}
                            name={t('failedExecutions')}
                            dot={{ 
                              fill: CHART_COLORS.chartRed, 
                              strokeWidth: 3, 
                              r: 6,
                              className: "hover:r-8 transition-all duration-200"
                            }}
                            activeDot={{ 
                              r: 10, 
                              stroke: CHART_COLORS.chartRed,
                              strokeWidth: 3,
                              fill: CHART_COLORS.background
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}



            {/* 趋势图表 */}
            {analyticsData && analyticsData.dailyTrend.length > 0 && (
              <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />

                <CardHeader className="relative px-6 py-5 border-b border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20 group-hover:ring-primary/30 transition-all duration-300">
                      <BarChart2 className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="text-xl font-bold text-foreground leading-relaxed">
                        {t("executionTrend")}
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
                            className="trend-item group/item relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:scale-[1.01] border border-border/30 bg-gradient-to-r from-background/60 to-background/90 hover:from-background/80 hover:to-background/95 hover:border-border/50 shadow-sm hover:shadow-md"
                            style={{ animationDelay: `${index * 0.1}s` }}
                          >
                            {/* 装饰性渐变背景 */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />

                            <div className="relative flex items-center gap-4">
                              {/* 日期卡片 - 统一样式 */}
                              <div className="flex-none">
                                <div className="w-16 h-14 rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-all duration-300 shadow-sm group-hover/item:shadow-md bg-gradient-to-br from-muted/80 to-muted/60 text-muted-foreground border border-border/40 hover:border-border/60">
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
                                        className={`text-xs font-medium px-3 py-1 transition-all duration-300 shadow-sm ${
                                          successRate >= 95
                                            ? "border-emerald-300 text-emerald-700 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:border-emerald-600 dark:text-emerald-300 dark:from-emerald-950/40 dark:to-emerald-950/20"
                                            : successRate >= 85
                                              ? "border-blue-300 text-blue-700 bg-gradient-to-r from-blue-50 to-blue-100 dark:border-blue-600 dark:text-blue-300 dark:from-blue-950/40 dark:to-blue-950/20"
                                              : successRate >= 70
                                                ? "border-amber-300 text-amber-700 bg-gradient-to-r from-amber-50 to-amber-100 dark:border-amber-600 dark:text-amber-300 dark:from-amber-950/40 dark:to-amber-950/20"
                                                : "border-red-300 text-red-700 bg-gradient-to-r from-red-50 to-red-100 dark:border-red-600 dark:text-red-300 dark:from-red-950/40 dark:to-red-950/20"
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
                                        <div className="w-2.5 h-2.5 rounded-full shadow-sm"
                                             style={{ background: `linear-gradient(to bottom right, ${CHART_COLORS.chartGreen}, ${CHART_COLORS.success})` }}></div>
                                        <span className="font-semibold"
                                              style={{ color: CHART_COLORS.chartGreen }}>
                                          {day.successes}
                                        </span>
                                      </div>
                                      {day.failures > 0 && (
                                        <div className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors"
                                             style={{ backgroundColor: CHART_COLORS.lightRed }}>
                                          <div className="w-2.5 h-2.5 rounded-full shadow-sm"
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
                                  <div className="h-4 rounded-full bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 overflow-hidden shadow-inner border border-gray-200/50 dark:border-gray-600/50">
                                    {day.executions > 0 && (
                                      <>
                                        {/* 成功部分 */}
                                        <div
                                          className="absolute left-0 top-0 h-full shadow-sm transition-all duration-700 ease-out relative overflow-hidden"
                                          style={{
                                            background: `linear-gradient(to right, ${CHART_COLORS.chartGreen}, ${CHART_COLORS.success})`,
                                            width: `${(day.successes / day.executions) * 100}%`,
                                            animation: `progressFill 1s ease-out ${index * 0.1}s both`,
                                          }}
                                        >
                                          {/* 内部光效 */}
                                          <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-white/20 to-transparent"></div>
                                        </div>
                                        {/* 失败部分 */}
                                        {day.failures > 0 && (
                                          <div
                                            className="absolute top-0 h-full shadow-sm transition-all duration-700 ease-out relative overflow-hidden"
                                            style={{
                                              background: `linear-gradient(to right, ${CHART_COLORS.chartRed}, ${CHART_COLORS.failed})`,
                                              left: `${(day.successes / day.executions) * 100}%`,
                                              width: `${(day.failures / day.executions) * 100}%`,
                                              animation: `progressFill 1s ease-out ${index * 0.1 + 0.3}s both`,
                                            }}
                                          >
                                            {/* 内部光效 */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-white/20 to-transparent"></div>
                                          </div>
                                        )}

                                        {/* 顶部发光效果 */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-white/10 to-white/30 opacity-0 group-hover/item:opacity-100 transition-opacity duration-500"></div>
                                      </>
                                    )}
                                  </div>

                                  {/* 动态光线扫过效果 */}
                                  <div className="absolute inset-0 h-4 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover/item:opacity-100 transition-all duration-700 transform -skew-x-12 group-hover/item:animate-pulse"></div>
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
              <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />

                <CardHeader className="relative px-6 py-5 border-b border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20 group-hover:ring-primary/30 transition-all duration-300">
                      <Target className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="text-xl font-bold text-foreground leading-relaxed">
                        {t("scriptPerformanceAnalysis")}
                        {analyticsData && analyticsData.scriptAnalytics.length > ITEMS_PER_PAGE && (
                          <span className="text-base font-medium text-muted-foreground ml-3">
                            ({formatPageInfo(analyticsData.scriptAnalytics.length)})
                          </span>
                        )}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="relative px-6 py-6">
                  <div className="space-y-6">
                    {analyticsData.scriptAnalytics
                      .sort((a, b) => {
                        // 优先按成功率排序，然后按执行次数排序
                        if (Math.abs(a.successRate - b.successRate) < 0.1) {
                          return b.totalExecutions - a.totalExecutions;
                        }
                        return b.successRate - a.successRate;
                      })
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map((script, index) => {
                        const successRateStatus = getSuccessRateStatus(
                          script.successRate,
                        );

                        return (
                          <div
                            key={script.scriptId}
                            className="group/script p-4 rounded-lg border border-border/20 bg-background/30 hover:bg-background/50 transition-all duration-300 hover:shadow-md hover:border-border/40"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4
                                    className="font-semibold text-foreground truncate group-hover/script:text-primary transition-colors"
                                    title={script.scriptName}
                                  >
                                    {script.scriptName}
                                  </h4>
                                  <Badge
                                    className={`font-medium px-3 py-1 transition-all duration-300 ${successRateStatus.color} text-white`}
                                  >
                                    {script.successRate.toFixed(1)}%
                                  </Badge>
                                  {index < 3 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-300"
                                    >
                                      {t("topRanking")} {index + 1}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground font-mono">
                                  {script.scriptId}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                              <div className="text-center p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                  <Activity className="h-4 w-4 text-primary" />
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {t("executionsLabel")}
                                  </p>
                                </div>
                                <p className="font-bold text-lg text-foreground">
                                  {script.totalExecutions}
                                </p>
                              </div>
                              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  <p className="text-xs font-medium text-green-600 dark:text-green-400">
                                    {t("successLabel")}
                                  </p>
                                </div>
                                <p className="font-bold text-lg text-green-600">
                                  {script.successCount}
                                </p>
                              </div>
                              <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                  <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                    {t("failedLabel")}
                                  </p>
                                </div>
                                <p className="font-bold text-lg text-red-600">
                                  {script.failedCount}
                                </p>
                              </div>
                              <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                  <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                  <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                                    {t("attentionLabel")}
                                  </p>
                                </div>
                                <p className="font-bold text-lg text-orange-600">
                                  {script.attentionCount}
                                </p>
                              </div>
                            </div>

                            {script.lastExecution && (
                              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 px-3 py-2 rounded-lg">
                                <Clock className="h-3 w-3" />
                                <span className="font-medium">
                                  {t("lastExecution")}:
                                </span>
                                <span className="font-mono">
                                  {formatDate(script.lastExecution, language)}
                                </span>
                                <div className="ml-auto flex items-center gap-2">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      new Date(script.lastExecution) >
                                      new Date(Date.now() - 24 * 60 * 60 * 1000)
                                        ? "bg-green-500 animate-pulse"
                                        : "bg-gray-400"
                                    }`}
                                  ></div>
                                  <span className="text-xs">
                                    {new Date(script.lastExecution) >
                                    new Date(Date.now() - 24 * 60 * 60 * 1000)
                                      ? t("recentExecution")
                                      : t("earlierExecution")}
                                  </span>
                                </div>
                              </div>
                            )}

                            <div className="relative">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-muted-foreground">
                                  {t("successRateLabel")}
                                </span>
                                <span className="text-sm font-bold text-foreground">
                                  {successRateStatus.label}
                                </span>
                              </div>
                              <Progress
                                value={script.successRate}
                                className="h-3 transition-all duration-500 hover:h-4"
                              />
                            </div>
                          </div>
                        );
                      })}
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
                        className="h-7 px-2 text-xs shadow-sm hover:shadow transition-all duration-150 relative z-30"
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
                        className="h-7 px-2 text-xs shadow-sm hover:shadow transition-all duration-150 relative z-30"
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
              <Card className="border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90">
                <CardContent className="p-12 text-center">
                  <div className="h-8 w-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-lg font-medium text-muted-foreground">
                    {t("loadingAnalyticsData")}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 错误状态 */}
            {error && (
              <Card className="border-2 border-red-200/50 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20">
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                  <p className="text-lg font-medium text-red-700 dark:text-red-400 mb-2">
                    {t("dataLoadFailed")}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mb-4">
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
                <Card className="border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90">
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
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-mono text-xs text-muted-foreground font-medium">
            v{process.env.NEXT_PUBLIC_APP_VERSION || "0.1.9"}
          </span>
        </div>
      </div>
    </div>
  );
}
