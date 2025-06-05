"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, ListChecks, Clock } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";

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
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
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

  // 稳定的setSelectedScriptId包装函数，避免无限循环
  const stableSetSelectedScriptId = useCallback((scriptId: string) => {
    setSelectedScriptId(scriptId);
  }, []);

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
    // 防止重复调用 - 使用更强的防护机制
    if (isLoadingRef.current) {
      console.log("🚫 防止重复调用：loadInitialData已在执行中");
      return;
    }

    // 设置防护标志
    isLoadingRef.current = true;
    setLoading(true);
    setIsFetchingScripts(true);

    // 添加唯一的请求ID
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log(`🚀 开始数据加载请求 ${requestId}`);

    try {
      const [scriptsResult, checksResult] = await Promise.all([
        // 获取脚本列表
        fetch("/api/list-scripts", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Request-ID": requestId, // 添加请求标识
          },
        }),
        // 获取检查历史数据（获取更多数据，用于显示和统计）
        fetch("/api/check-history?limit=500&includeResults=false", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Request-ID": requestId, // 添加请求标识
          },
        }),
      ]);

      console.log(`✅ API响应完成 ${requestId}:`, {
        scriptsOk: scriptsResult.ok,
        checksOk: checksResult.ok
      });

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

        if (process.env.NODE_ENV === "development") {
          console.log("📋 脚本数据加载完成:", {
            count: scriptsData.length,
            scripts: scriptsData.map(s => ({
              scriptId: s.scriptId,
              name: s.name,
              hashtags: s.hashtags
            }))
          });
        }

        // 验证状态更新
        setTimeout(() => {
          // 状态验证已完成
        }, 100);
      } else {
        throw new Error(
          `脚本列表获取失败: ${scriptsResult.status} ${scriptsResult.statusText}`,
        );
      }

      // 处理检查历史数据响应
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

        // 统一计算整体统计数据（使用同一份数据）
        const overallSuccessCount = processedChecks.filter(
          (c) => c.status === "success" && c.statusType !== "attention_needed",
        ).length;
        const overallFailureCount = processedChecks.filter(
          (c) => c.status === "failure",
        ).length;
        const overallNeedsAttentionCount = processedChecks.filter(
          (c) => c.statusType === "attention_needed",
        ).length;
        const overallTotalCount = processedChecks.length;

        setOverallStats({
          totalCount: overallTotalCount,
          successCount: overallSuccessCount,
          failureCount: overallFailureCount,
          needsAttentionCount: overallNeedsAttentionCount,
        });

        if (process.env.NODE_ENV === "development") {
          console.log("📊 检查数据和统计加载完成:", {
            totalChecks: overallTotalCount,
            successCount: overallSuccessCount,
            failureCount: overallFailureCount,
            needsAttentionCount: overallNeedsAttentionCount,
            sampleChecks: processedChecks.slice(0, 3).map(c => ({
              script_name: c.script_name,
              script_id: c.script_id,
              status: c.status,
              statusType: c.statusType
            }))
          });
        }

        // 验证状态更新
        setTimeout(() => {
          // 状态验证已完成
        }, 100);
      } else {
        throw new Error(
          `检查历史获取失败: ${checksResult.status} ${checksResult.statusText}`,
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

    // 检查是否从管理页面跳转过来并需要过滤特定脚本
    const filterScriptId = sessionStorage.getItem("filter-script-id");
    if (filterScriptId) {
      setSearchTerm(filterScriptId);
      setFilterStatus(null); // 显示所有状态
      setCurrentPage(1); // 重置到第一页
      // 清除sessionStorage中的值，避免重复过滤
      sessionStorage.removeItem("filter-script-id");
      
      // 滚动到执行历史部分
      setTimeout(() => {
        const historyElement = document.getElementById("execution-history");
        if (historyElement) {
          historyElement.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }

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
      stableSetSelectedScriptId(availableScripts[0].scriptId);
    }
    // If scripts become unavailable AND a script was previously selected, clear the selection
    else if (
      selectedScriptId &&
      (!Array.isArray(availableScripts) || availableScripts.length === 0)
    ) {
      stableSetSelectedScriptId("");
    }
  }, [availableScripts, selectedScriptId, stableSetSelectedScriptId]);

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

    // 添加数据结构调试信息
    if (process.env.NODE_ENV === "development") {
      console.log('🔍 搜索调试信息:', {
        searchTerm: searchTerm,
        selectedHashtags: selectedHashtags,
        totalChecks: checks.length,
        availableScriptsCount: availableScripts.length,
        sampleCheck: checks[0] ? {
          script_name: checks[0].script_name,
          script_id: checks[0].script_id,
          status: checks[0].status
        } : null,
        sampleScript: availableScripts[0] ? {
          scriptId: availableScripts[0].scriptId,
          name: availableScripts[0].name,
          cnName: availableScripts[0].cnName,
          hashtags: availableScripts[0].hashtags
        } : null
      });
    }

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

    // 文本搜索筛选 - 支持hashtag搜索
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      
      // 检查是否是hashtag搜索（以#开头）
      if (term.startsWith('#')) {
        const hashtagToSearch = term.substring(1); // 移除#符号
        console.log('🔍 Hashtag搜索开始:', {
          originalTerm: searchTerm,
          hashtagToSearch: hashtagToSearch,
          availableScriptsWithHashtags: availableScripts.filter(s => s.hashtags && s.hashtags.length > 0).map(s => ({
            scriptId: s.scriptId,
            name: s.name,
            cnName: s.cnName,
            hashtags: s.hashtags
          }))
        });
        
        filtered = filtered.filter((check) => {
          // 尝试多种方式找到对应的脚本
          const script = availableScripts.find(s => 
            s.scriptId === check.script_name || 
            s.name === check.script_name ||
            s.cnName === check.script_name ||
            s.scriptId === check.script_id ||
            s.name === check.script_id ||
            s.cnName === check.script_id ||
            // 尝试部分匹配
            check.script_name.includes(s.scriptId) ||
            s.scriptId.includes(check.script_name) ||
            (s.name && check.script_name.includes(s.name)) ||
            (s.name && s.name.includes(check.script_name)) ||
            (s.cnName && check.script_name.includes(s.cnName)) ||
            (s.cnName && s.cnName.includes(check.script_name))
          );
          
          if (process.env.NODE_ENV === "development") {
            console.log('🔍 脚本匹配尝试:', {
              checkScriptName: check.script_name,
              checkScriptId: check.script_id,
              foundScript: script ? {
                scriptId: script.scriptId,
                name: script.name,
                cnName: script.cnName,
                hashtags: script.hashtags
              } : null
            });
          }
          
          if (!script) {
            if (process.env.NODE_ENV === "development") {
              console.log('❌ 未找到脚本匹配:', {
                checkScriptName: check.script_name,
                checkScriptId: check.script_id,
                availableScriptIds: availableScripts.map(s => s.scriptId),
                availableScriptNames: availableScripts.map(s => s.name),
                availableScriptCnNames: availableScripts.map(s => s.cnName)
              });
            }
            return false;
          }
          
          if (!script.hashtags || script.hashtags.length === 0) {
            if (process.env.NODE_ENV === "development") {
              console.log('❌ 脚本无标签:', {
                scriptId: script.scriptId,
                hashtags: script.hashtags
              });
            }
            return false;
          }
          
          // 检查脚本的hashtag是否包含搜索词
          const hasMatchingTag = script.hashtags.some(tag => 
            tag.toLowerCase().includes(hashtagToSearch) ||
            hashtagToSearch.includes(tag.toLowerCase())
          );
          
          if (process.env.NODE_ENV === "development") {
            console.log('🎯 标签匹配检查:', {
              searchTerm: hashtagToSearch,
              scriptTags: script.hashtags,
              scriptName: script.name,
              hasMatchingTag: hasMatchingTag,
              tagMatches: script.hashtags.map(tag => ({
                tag: tag,
                lowerTag: tag.toLowerCase(),
                includes: tag.toLowerCase().includes(hashtagToSearch),
                reverseIncludes: hashtagToSearch.includes(tag.toLowerCase())
              }))
            });
          }
          
          return hasMatchingTag;
        });
        
        console.log('📊 Hashtag搜索结果:', {
          searchTerm: hashtagToSearch,
          totalChecks: checks.length,
          beforeFilter: checks.length,
          afterFilter: filtered.length,
          filteredChecks: filtered.map(c => ({
            script_name: c.script_name,
            script_id: c.script_id,
            status: c.status
          }))
        });
      } else {
        // 普通文本搜索
        filtered = filtered.filter(
          (check) =>
            check.script_name.toLowerCase().includes(term) ||
            (check.message && check.message.toLowerCase().includes(term)) ||
            (check.findings && check.findings.toLowerCase().includes(term)),
        );
      }
    }

    // Hashtag筛选 - 根据脚本的hashtag进行筛选
    if (selectedHashtags.length > 0) {
      filtered = filtered.filter((check) => {
        // 找到对应的脚本
        const script = availableScripts.find(s => s.scriptId === check.script_name || s.name === check.script_name);
        if (!script || !script.hashtags || script.hashtags.length === 0) return false;
        // 检查脚本是否包含所有选中的hashtag
        return selectedHashtags.every(tag => script.hashtags?.includes(tag));
      });
    }

    // 排序
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
  }, [checks, filterStatus, searchTerm, selectedHashtags, sortConfig, availableScripts]);

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

          {/* Manual Trigger & Stats Combined Section */}
          <section className="space-y-6">
            <div className="flex gap-6 lg:flex-row flex-col lg:items-stretch items-start">
              {/* Manual Trigger - Left Side (2/3) */}
              <div className="flex-1 lg:flex-[2] w-full">
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
                  setSelectedScriptId={stableSetSelectedScriptId}
                  handleTriggerCheck={handleTriggerCheck}
                />
              </div>
              
              {/* Stats Cards - Right Side (1/3) Vertical Layout */}
              <div className="flex-1 w-full lg:w-auto">
                <StatsCards
                  nextScheduled={nextScheduled}
                  successCount={successCount}
                  allChecksCount={allChecksCount}
                  needsAttentionCount={needsAttentionCount}
                  successRate={successRate}
                  language={language}
                  t={t}
                  isVerticalLayout={true}
                />
              </div>
            </div>
          </section>

          {/* Check History Section */}
          <section id="execution-history" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                  <div className="icon-container bg-primary/10 rounded-xl p-2">
                    <ListChecks className="h-6 w-6 text-primary" />
                  </div>
                  {t("checkHistoryTitle")}
                </h2>
              </div>

            </div>

            <CheckHistory
              paginatedChecks={paginatedChecks}
              allChecksCount={totalChecks}
              totalUnfilteredCount={allChecksCount}
              totalPages={totalPages}
              currentPage={currentPage}
              filterStatus={filterStatus}
              searchTerm={searchTerm}
              selectedHashtags={selectedHashtags}
              sortConfig={sortConfig}
              successCount={successCount}
              failureCount={failureCount}
              needsAttentionCount={needsAttentionCount}
              language={language}
              t={t}
              setFilterStatus={setFilterStatus}
              setSearchTerm={setSearchTerm}
              setSelectedHashtags={setSelectedHashtags}
              setCurrentPage={setCurrentPage}
              requestSort={requestSort}
              startIndex={startIndex}
              endIndex={endIndex}
              availableScripts={availableScripts}
            />
          </section>

          {/* Footer Section */}
          <section className="pt-8 border-t border-border/20">
            <DashboardFooter t={t} />
          </section>
    </div>
  );
};

export default Dashboard;
