"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, AreaChart, ListChecks, Clock } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";
import Link from "next/link";

// Import shadcn UI components
import { Button } from "@/components/ui/button";

// Import subcomponents and types from dashboard folder
import {
  Check,
  dashboardTranslations,
  DashboardTranslationKeys,
  ITEMS_PER_PAGE,
  ScriptInfo,
} from "@/components/dashboard/types";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ManualTrigger } from "@/components/dashboard/ManualTrigger";
import { CheckHistory } from "@/components/dashboard/CheckHistory";
import { LoadingError } from "@/components/dashboard/LoadingError";
import {
  SkeletonCard,
  SkeletonTable,
} from "@/components/dashboard/SkeletonComponents";
import { DashboardFooter } from "@/components/dashboard/DashboardFooter";

// --- Main Component ---
const Dashboard = () => {
  // --- State Hooks ---
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextScheduled, setNextScheduled] = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Check | "";
    direction: "ascending" | "descending";
  }>({ key: "execution_time", direction: "descending" });
  const [availableScripts, setAvailableScripts] = useState<ScriptInfo[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");
  const [isFetchingScripts, setIsFetchingScripts] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);
  const [triggerMessageType, setTriggerMessageType] = useState<
    "success" | "error" | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);

  // 新增：分离统计数据状态
  const [overallStats, setOverallStats] = useState<{
    totalCount: number;
    successCount: number;
    failureCount: number;
    needsAttentionCount: number;
  }>({
    totalCount: 0,
    successCount: 0,
    failureCount: 0,
    needsAttentionCount: 0,
  });

  // API调用去重：使用ref来避免重复调用
  const isLoadingRef = useRef(false);

  // --- Context Hooks ---
  const { language } = useLanguage();

  // --- Translation Helper ---
  const t = useCallback(
    (key: DashboardTranslationKeys): string => {
      const langTranslations =
        dashboardTranslations[language] || dashboardTranslations.en;
      return langTranslations[key as keyof typeof langTranslations] || key;
    },
    [language],
  );

  const loadInitialData = useCallback(async () => {
    // 防止重复调用
    if (isLoadingRef.current) {
      return;
    }

    setLoading(true);
    setIsFetchingScripts(true);
    isLoadingRef.current = true;

    try {
      // 并行获取脚本列表、检查历史显示数据和统计数据
      const [scriptsResult, checksResult, statsResult] = await Promise.all([
        // 获取脚本列表
        fetch("/api/list-scripts", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }),
        // 获取检查历史显示数据（恢复原有的500条限制，支持前端分页）
        fetch("/api/check-history?limit=500&includeResults=false", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }),
        // 获取统计数据（所有记录，仅用于统计计算）
        fetch("/api/check-history?limit=1000&includeResults=false", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ]);

      // 处理脚本列表响应
      if (scriptsResult.ok) {
        const scriptsResponseData = await scriptsResult.json();
        let scriptsData: ScriptInfo[] = [];

        // 处理不同的API响应格式
        if (scriptsResponseData && typeof scriptsResponseData === "object") {
          if (Array.isArray(scriptsResponseData)) {
            // 直接是数组格式
            scriptsData = scriptsResponseData;
          } else if (
            scriptsResponseData.data &&
            Array.isArray(scriptsResponseData.data)
          ) {
            // { data: [...] } 格式
            scriptsData = scriptsResponseData.data;
          } else if (
            scriptsResponseData.success &&
            Array.isArray(scriptsResponseData.data)
          ) {
            // { success: true, data: [...] } 格式
            scriptsData = scriptsResponseData.data;
          } else if (
            scriptsResponseData.scripts &&
            Array.isArray(scriptsResponseData.scripts)
          ) {
            // { scripts: [...] } 格式
            scriptsData = scriptsResponseData.scripts;
          } else {
            // 其他可能的格式，尝试从其他字段获取
            const possibleArrayFields = ["items", "results", "list"];
            for (const field of possibleArrayFields) {
              if (
                scriptsResponseData[field] &&
                Array.isArray(scriptsResponseData[field])
              ) {
                scriptsData = scriptsResponseData[field];
                break;
              }
            }
          }
        }

        // 确保数据是数组格式
        if (!Array.isArray(scriptsData)) {
          scriptsData = [];
        }

        setAvailableScripts(scriptsData);
        setIsFetchingScripts(false);

        // 验证状态更新
        setTimeout(() => {
          // 状态验证已完成
        }, 100);
      } else {
        throw new Error(
          `脚本列表获取失败: ${scriptsResult.status} ${scriptsResult.statusText}`,
        );
      }

      // 处理检查历史显示数据响应
      if (checksResult.ok) {
        const checksResponseData = await checksResult.json();
        let checksData: Check[] = [];

        // 处理不同的API响应格式，支持历史数据
        if (checksResponseData && typeof checksResponseData === "object") {
          if (Array.isArray(checksResponseData)) {
            // 直接是数组格式
            checksData = checksResponseData;
          } else if (
            checksResponseData.data &&
            Array.isArray(checksResponseData.data)
          ) {
            // { data: [...] } 格式
            checksData = checksResponseData.data;
          } else if (
            checksResponseData.checks &&
            Array.isArray(checksResponseData.checks)
          ) {
            // { checks: [...] } 格式 (历史格式支持)
            checksData = checksResponseData.checks;
          } else if (
            checksResponseData.success &&
            Array.isArray(checksResponseData.data)
          ) {
            // { success: true, data: [...] } 格式
            checksData = checksResponseData.data;
          } else {
            // 其他可能的格式
            const possibleArrayFields = ["items", "results", "list", "records"];
            for (const field of possibleArrayFields) {
              if (
                checksResponseData[field] &&
                Array.isArray(checksResponseData[field])
              ) {
                checksData = checksResponseData[field];
                break;
              }
            }
          }
        }

        // 确保数据是数组格式
        if (!Array.isArray(checksData)) {
          checksData = [];
        }

        // 处理日期字段，确保兼容性
        const processedChecks = checksData.map((check) => ({
          ...check,
          // 安全处理日期字段
          createdAt: check.createdAt
            ? typeof check.createdAt === "string"
              ? check.createdAt
              : check.createdAt.toString()
            : new Date().toISOString(),
        }));

        setChecks(processedChecks);

        // 验证状态更新
        setTimeout(() => {
          // 状态验证已完成
        }, 100);
      } else {
        throw new Error(
          `检查历史获取失败: ${checksResult.status} ${checksResult.statusText}`,
        );
      }

      // 处理统计数据响应
      if (statsResult.ok) {
        const statsResponseData = await statsResult.json();
        let statsData: Check[] = [];

        // 处理不同的API响应格式
        if (statsResponseData && typeof statsResponseData === "object") {
          if (Array.isArray(statsResponseData)) {
            statsData = statsResponseData;
          } else if (
            statsResponseData.data &&
            Array.isArray(statsResponseData.data)
          ) {
            statsData = statsResponseData.data;
          } else if (
            statsResponseData.checks &&
            Array.isArray(statsResponseData.checks)
          ) {
            statsData = statsResponseData.checks;
          } else if (
            statsResponseData.success &&
            Array.isArray(statsResponseData.data)
          ) {
            statsData = statsResponseData.data;
          } else {
            const possibleArrayFields = ["items", "results", "list", "records"];
            for (const field of possibleArrayFields) {
              if (
                statsResponseData[field] &&
                Array.isArray(statsResponseData[field])
              ) {
                statsData = statsResponseData[field];
                break;
              }
            }
          }
        }

        // 确保数据是数组格式
        if (!Array.isArray(statsData)) {
          statsData = [];
        }

        // 计算整体统计数据
        const overallSuccessCount = statsData.filter(
          (c) => c.status === "success" && c.statusType !== "attention_needed",
        ).length;
        const overallFailureCount = statsData.filter(
          (c) => c.status === "failure",
        ).length;
        const overallNeedsAttentionCount = statsData.filter(
          (c) => c.statusType === "attention_needed",
        ).length;
        const overallTotalCount = statsData.length;

        setOverallStats({
          totalCount: overallTotalCount,
          successCount: overallSuccessCount,
          failureCount: overallFailureCount,
          needsAttentionCount: overallNeedsAttentionCount,
        });

        console.log("📊 统计数据更新:", {
          totalCount: overallTotalCount,
          successCount: overallSuccessCount,
          failureCount: overallFailureCount,
          needsAttentionCount: overallNeedsAttentionCount,
        });
      } else {
        throw new Error(
          `统计数据获取失败: ${statsResult.status} ${statsResult.statusText}`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "数据加载失败");
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    const now = new Date();
    const nextRun = new Date();
    // 设置下一个运行时间为 UTC 19:00
    nextRun.setUTCHours(19, 0, 0, 0);
    // 如果 UTC 19:00 已经过去，则设置为明天的 UTC 19:00
    if (nextRun < now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    //直接将 Date 对象传递给状态，显示时会由 formatDate 处理
    setNextScheduled(nextRun);

    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .animate-fadeIn { animation: fadeIn 0.5s ease-in-out; }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 移除loadInitialData依赖，避免重复调用

  useEffect(() => {
    // Only set a default if no script is currently selected AND there are available scripts
    if (
      !selectedScriptId &&
      Array.isArray(availableScripts) &&
      availableScripts.length > 0
    ) {
      setSelectedScriptId(availableScripts[0].scriptId);
    }
    // If scripts become unavailable AND a script was previously selected, clear the selection
    else if (
      selectedScriptId &&
      (!Array.isArray(availableScripts) || availableScripts.length === 0)
    ) {
      setSelectedScriptId("");
    }
  }, [availableScripts, selectedScriptId]);

  // 调试：监控状态变化
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 availableScripts 状态变化:", {
        length: Array.isArray(availableScripts)
          ? availableScripts.length
          : "not array",
        data: availableScripts,
      });
    }
  }, [availableScripts]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 checks 状态变化:", {
        length: Array.isArray(checks) ? checks.length : "not array",
        data: checks.slice(0, 2), // 只显示前两条以避免日志过长
      });
    }
  }, [checks]);

  const handleTriggerCheck = useCallback(async () => {
    if (!selectedScriptId || isTriggering) return;

    setIsTriggering(true);
    setTriggerMessage(null);
    setTriggerMessageType(null);

    try {
      const response = await fetch("/api/run-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId: selectedScriptId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Trigger failed");
      }

      const successMessage =
        result.localizedMessage ||
        result.message ||
        "Script triggered successfully";
      setTriggerMessage(successMessage);
      setTriggerMessageType("success");

      toast.success("Trigger Success", {
        description: successMessage,
        duration: 5000,
      });

      // 刷新数据
      await loadInitialData();
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to trigger check:", err);
      }
      const errorMessage =
        err instanceof Error
          ? err.message || "Trigger failed"
          : "Trigger failed";
      // 尝试提取本地化错误消息
      let localizedErrorMessage = errorMessage;
      try {
        if (
          err instanceof Error &&
          err.cause &&
          typeof err.cause === "object"
        ) {
          const cause = err.cause as Record<string, unknown>;
          if (
            "localizedMessage" in cause &&
            typeof cause.localizedMessage === "string"
          ) {
            localizedErrorMessage = cause.localizedMessage;
          }
        }
      } catch (extractError) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error extracting localized message:", extractError);
        }
        // 出错时使用默认错误消息
      }

      setTriggerMessage(localizedErrorMessage);
      setTriggerMessageType("error");
      toast.error("Trigger Failed", {
        description: localizedErrorMessage,
        duration: 8000,
      });
    } finally {
      setIsTriggering(false);
      setTimeout(() => {
        setTriggerMessage(null);
        setTriggerMessageType(null);
      }, 8000);
    }
  }, [selectedScriptId, isTriggering, loadInitialData]); // 移除language依赖

  const requestSort = (key: keyof Check) => {
    if (sortConfig.key === key) {
      setSortConfig({
        key,
        direction:
          sortConfig.direction === "ascending" ? "descending" : "ascending",
      });
    } else {
      setSortConfig({ key, direction: "descending" });
    }
    setCurrentPage(1);
  };

  const filteredAndSortedChecks = React.useMemo(() => {
    let filtered = checks;

    // 根据不同的筛选状态进行过滤
    if (filterStatus === "success") {
      filtered = filtered.filter(
        (check) =>
          check.status === "success" && check.statusType !== "attention_needed",
      );
    } else if (filterStatus === "failure") {
      filtered = filtered.filter((check) => check.status === "failure");
    } else if (filterStatus === "attention_needed") {
      filtered = filtered.filter(
        (check) => check.statusType === "attention_needed",
      );
    }
    // filterStatus === null 时显示所有记录

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (check) =>
          check.script_name.toLowerCase().includes(term) ||
          (check.message && check.message.toLowerCase().includes(term)) ||
          (check.findings && check.findings.toLowerCase().includes(term)),
      );
    }
    if (sortConfig.key !== "") {
      filtered = [...filtered].sort((a, b) => {
        const key = sortConfig.key as keyof Check;
        if (key === "execution_time") {
          return sortConfig.direction === "ascending"
            ? new Date(a[key] as string).getTime() -
                new Date(b[key] as string).getTime()
            : new Date(b[key] as string).getTime() -
                new Date(a[key] as string).getTime();
        } else {
          const aValue = String(a[key] || "");
          const bValue = String(b[key] || "");
          return sortConfig.direction === "ascending"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
      });
    }
    return filtered;
  }, [checks, filterStatus, searchTerm, sortConfig]);

  const totalChecks = filteredAndSortedChecks.length;
  const totalPages = Math.ceil(totalChecks / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedChecks = filteredAndSortedChecks.slice(startIndex, endIndex);

  const selectedScript = React.useMemo(
    () =>
      Array.isArray(availableScripts)
        ? availableScripts.find((s) => s.scriptId === selectedScriptId)
        : undefined,
    [availableScripts, selectedScriptId],
  );

  // 使用整体统计数据而不是显示数据进行统计计算
  const successCount = overallStats.successCount;
  const failureCount = overallStats.failureCount;
  const needsAttentionCount = overallStats.needsAttentionCount;
  const allChecksCount = overallStats.totalCount;
  const successRate =
    allChecksCount > 0 ? Math.round((successCount / allChecksCount) * 100) : 0;

  // 调试信息
  if (process.env.NODE_ENV === "development") {
    console.log("Dashboard渲染状态:");
    console.log("  - loading:", loading);
    console.log("  - isFetchingScripts:", isFetchingScripts);
    console.log(
      "  - availableScripts length:",
      Array.isArray(availableScripts) ? availableScripts.length : "not array",
    );
    console.log("  - checks length:", checks.length);
    console.log(
      "  - filteredAndSortedChecks length:",
      filteredAndSortedChecks.length,
    );
    console.log("  - paginatedChecks length:", paginatedChecks.length);
    console.log("  - selectedScript:", selectedScript);
    console.log("  - error:", error);
  }

  if (loading && checks.length === 0 && isFetchingScripts) {
    return (
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonTable />
      </div>
    );
  }

  if (error) {
    return <LoadingError error={error} t={t} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-8 animate-fadeIn">
          {/* Header Section */}
          <header className="text-center lg:text-left">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-2">
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  {t("dashboardTitle")}
                </h1>
                {nextScheduled && (
                  <p className="text-base text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t("nextScheduledCheck")}:{" "}
                    {nextScheduled.toLocaleString(language, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <Link href="/data-analysis">
                  <Button
                    variant="outline"
                    size="lg"
                    className="group shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <AreaChart className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    {t("dataAnalysisButton")}
                  </Button>
                </Link>
                <Button
                  onClick={loadInitialData}
                  disabled={loading}
                  variant="outline"
                  size="lg"
                  className="group shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <RefreshCw
                    className={`mr-2 h-5 w-5 transition-transform ${loading ? "animate-spin" : "group-hover:rotate-45"}`}
                  />
                  {loading ? t("refreshingStatusText") : t("refreshDataButton")}
                </Button>
              </div>
            </div>
          </header>

          {/* Stats Cards Section */}
          <section className="space-y-4">
            <StatsCards
              nextScheduled={nextScheduled}
              successCount={successCount}
              allChecksCount={allChecksCount}
              needsAttentionCount={needsAttentionCount}
              successRate={successRate}
              language={language}
              t={t}
            />
          </section>

          {/* Manual Trigger Section */}
          <section className="space-y-4">
            <ManualTrigger
              availableScripts={availableScripts}
              selectedScriptId={selectedScriptId}
              selectedScript={selectedScript}
              isTriggering={isTriggering}
              isFetchingScripts={isFetchingScripts}
              loading={loading && isFetchingScripts}
              triggerMessage={triggerMessage}
              triggerMessageType={triggerMessageType}
              language={language}
              t={t}
              setSelectedScriptId={setSelectedScriptId}
              handleTriggerCheck={handleTriggerCheck}
            />
          </section>

          {/* Check History Section */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                  <div className="icon-container bg-primary/10 rounded-xl p-2">
                    <ListChecks className="h-6 w-6 text-primary" />
                  </div>
                  {t("checkHistoryTitle")}
                </h2>
              </div>
              <Link href="/manage-scripts">
                <Button
                  variant="outline"
                  size="lg"
                  className="group shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <ListChecks className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  {t("manageScriptsButton")}
                </Button>
              </Link>
            </div>

            <CheckHistory
              paginatedChecks={paginatedChecks}
              allChecksCount={totalChecks}
              totalUnfilteredCount={allChecksCount}
              totalPages={totalPages}
              currentPage={currentPage}
              filterStatus={filterStatus}
              searchTerm={searchTerm}
              sortConfig={sortConfig}
              successCount={successCount}
              failureCount={failureCount}
              needsAttentionCount={needsAttentionCount}
              language={language}
              t={t}
              setFilterStatus={setFilterStatus}
              setSearchTerm={setSearchTerm}
              setCurrentPage={setCurrentPage}
              requestSort={requestSort}
              startIndex={startIndex}
              endIndex={endIndex}
            />
          </section>

          {/* Footer Section */}
          <section className="pt-8 border-t border-border/20">
            <DashboardFooter t={t} />
          </section>
        </div>
      </div>

      {/* 版本号显示 - 固定在左下角 */}
      <div className="fixed left-6 bottom-6 z-50">
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-mono text-xs text-muted-foreground font-medium">
            v{process.env.NEXT_PUBLIC_APP_VERSION || "0.2.1"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
