"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/components/common/LanguageProvider";
import { Button } from "@/components/ui/button";
import {
  Home,
  Clock,
  AlertCircle,
  CheckCircle,
  Database,
  Search,
  Download,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import UserHeader from "@/components/layout/UserHeader";
import AnalysisResultDialog from '@/components/business/ai/AnalysisResultDialog';
import Link from "next/link";

// 基于SQL脚本实际输出的精确类型定义
interface OrderDuplicateDetail {
  external_order_id: string;
  count: number;
}

interface OrderSyncDetail {
  order_date: string;
  external_order_count: number;
}

// 通用类型，覆盖所有可能的结果类型
type FindingDetail =
  | OrderDuplicateDetail
  | OrderSyncDetail
  | Record<string, string | number | boolean | null>;

interface ExecutionResult {
  scriptId: string;
  executedAt: string;
  status: string;
  statusType?: string; // 可能存在的更详细状态
  message: string;
  findings: FindingDetail[] | string; // findings 可以是对象数组或字符串
  _id: string;
  name?: string;
  cnName?: string;
  description?: string;
  cnDescription?: string;
  scope?: string;
  cnScope?: string;
  author?: string;
}

// 语言翻译对象
const viewResultTranslations = {
  en: {
    loading: "Loading...",
    loadingFailed: "Loading Failed",
    retry: "Retry",
    back: "Back to Dashboard",
    notFound: "Result Not Found",
    noResultFound: "Could not find execution result with ID",
    executionDetails: "Execution Result Details",
    scriptId: "Script ID",
    name: "Name",
    cnName: "Name (CN)",
    description: "Description",
    cnDescription: "Description (CN)",
    scope: "Scope",
    cnScope: "Scope (CN)",
    author: "Author",
    scriptMetadata: "Script Metadata",
    executionTime: "Execution Time",
    status: "Status",
    message: "Message",
    resultId: "Result ID",
    queryFindings: "Query Findings",
    createdAt: "Created At",
    noData: "No Data Found",
    noDataDesc: "This script execution did not return any data",
    exportCsv: "Export CSV",
    exportCsvDesc: "Download findings as CSV file",
    noDataToExport: "No data available for export",
    scriptTypes: {
      check: "Check",
      validate: "Validate",
      monitor: "Monitor",
      report: "Report",
      other: "Other",
    },
    statusTexts: {
      success: "Success",
      attentionNeeded: "Attention Needed",
      failure: "Failed",
    },
  },
  zh: {
    loading: "加载中...",
    loadingFailed: "加载失败",
    retry: "重试",
    back: "返回仪表盘",
    notFound: "未找到结果",
    noResultFound: "无法找到ID为",
    executionDetails: "执行结果详情",
    scriptId: "脚本 ID",
    name: "名称",
    cnName: "中文名称",
    description: "描述",
    cnDescription: "中文描述",
    scope: "范围",
    cnScope: "中文范围",
    author: "作者",
    scriptMetadata: "脚本元数据",
    executionTime: "执行时间",
    status: "状态",
    message: "消息",
    resultId: "结果 ID",
    queryFindings: "查询发现",
    createdAt: "创建时间",
    noData: "无数据发现",
    noDataDesc: "此脚本执行未返回任何数据结果",
    exportCsv: "导出 CSV",
    exportCsvDesc: "下载发现结果为 CSV 文件",
    noDataToExport: "无可导出的数据",
    scriptTypes: {
      check: "检查",
      validate: "验证",
      monitor: "监控",
      report: "报告",
      other: "其他",
    },
    statusTexts: {
      success: "成功",
      attentionNeeded: "需要关注",
      failure: "失败",
    },
  },
};

export default function ViewExecutionResultPage() {
  const router = useRouter();
  const params = useParams() || {};
  const resultId = params.resultId as string | undefined;
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  
  // AI错误分析相关状态
  const [isAnalyzingError, setIsAnalyzingError] = useState(false);
  const [errorAnalysis, setErrorAnalysis] = useState<string | null>(null);
  const [isErrorAnalysisDialogOpen, setIsErrorAnalysisDialogOpen] = useState(false);

  // 可拖动滚动条状态
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showScrollBar, setShowScrollBar] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const dragStartRef = useRef<{
    startX: number;
    startScrollLeft: number;
    startScrollBarLeft: number;
  }>({
    startX: 0,
    startScrollLeft: 0,
    startScrollBarLeft: 0,
  });

  // 使用全局语言系统
  const { language } = useLanguage();
  const t = viewResultTranslations[language];

  // CSV导出功能
  const exportToCSV = () => {
    if (
      !result ||
      !Array.isArray(result.findings) ||
      result.findings.length === 0
    ) {
      return; // 无数据时不执行
    }

    const headers = Object.keys(result.findings[0]);
    const csvContent = [
      headers.join(","),
      ...result.findings.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row];
            if (value === null || value === undefined) return "";
            const stringValue = String(value);
            if (
              stringValue.includes(",") ||
              stringValue.includes('"') ||
              stringValue.includes("\n")
            ) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${result.scriptId}_findings_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 优化后的滚动条更新函数
  const updateScrollBarPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    const scrollBar = scrollBarRef.current;
    if (!container || !scrollBar || isDragging) return;

    const scrollRatio =
      container.scrollLeft /
      Math.max(1, container.scrollWidth - container.clientWidth);
    const scrollBarTrackWidth = scrollBar.parentElement!.clientWidth;
    const scrollBarWidth = scrollBar.clientWidth;
    const maxScrollBarLeft = Math.max(0, scrollBarTrackWidth - scrollBarWidth);

    const newLeft = scrollRatio * maxScrollBarLeft;
    scrollBar.style.transform = `translateX(${newLeft}px)`;
  }, [isDragging]);

  // 检查是否需要显示滚动条
  useEffect(() => {
    const checkScrollBar = () => {
      if (scrollContainerRef.current) {
        const { scrollWidth, clientWidth } = scrollContainerRef.current;
        const needsScrollBar = scrollWidth > clientWidth + 1; // 添加1px容差
        setShowScrollBar(needsScrollBar);

        if (needsScrollBar) {
          // 初始化滚动条位置
          requestAnimationFrame(updateScrollBarPosition);
        }
      }
    };

    checkScrollBar();
    const handleResize = () => {
      requestAnimationFrame(checkScrollBar);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [result, updateScrollBarPosition]);

  // 初始化滚动条
  useEffect(() => {
    if (result && showScrollBar) {
      // 延迟一帧确保DOM已经渲染完成
      requestAnimationFrame(() => {
        requestAnimationFrame(updateScrollBarPosition);
      });
    }
  }, [result, showScrollBar, updateScrollBarPosition]);

  // 传统滚动条拖动处理 - 只允许点击滑块本身拖动
  const handleScrollBarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // 防止事件冒泡到轨道
    setIsDragging(true);

    const container = scrollContainerRef.current;
    const scrollBar = scrollBarRef.current;
    if (!container || !scrollBar) return;

    // 记录拖动开始时的状态
    const currentTransform = scrollBar.style.transform;
    const currentLeft = parseFloat(
      currentTransform.replace("translateX(", "").replace("px)", "") || "0",
    );

    dragStartRef.current = {
      startX: e.clientX,
      startScrollLeft: container.scrollLeft,
      startScrollBarLeft: currentLeft,
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        const scrollBar = scrollBarRef.current;
        if (!container || !scrollBar) return;

        // 计算鼠标移动的距离
        const deltaX = e.clientX - dragStartRef.current.startX;
        const trackWidth = scrollBar.parentElement!.clientWidth;
        const scrollBarWidth = scrollBar.clientWidth;
        const maxScrollBarLeft = Math.max(0, trackWidth - scrollBarWidth);

        // 计算新的滚动条位置（基于相对位移）
        const newScrollBarLeft = Math.max(
          0,
          Math.min(
            maxScrollBarLeft,
            dragStartRef.current.startScrollBarLeft + deltaX,
          ),
        );

        // 计算对应的容器滚动位置
        const scrollRatio =
          maxScrollBarLeft > 0 ? newScrollBarLeft / maxScrollBarLeft : 0;
        const maxScrollLeft = Math.max(
          0,
          container.scrollWidth - container.clientWidth,
        );
        const newScrollLeft = scrollRatio * maxScrollLeft;

        // 更新位置
        container.scrollLeft = newScrollLeft;
        scrollBar.style.transform = `translateX(${newScrollBarLeft}px)`;
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // 优化的容器滚动处理
  const handleContainerScroll = () => {
    if (isDragging) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(updateScrollBarPosition);
  };

  useEffect(() => {
    if (resultId) {
      fetch(`/api/execution-details/${resultId}`)
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || `Error: ${res.status}`);
          }
          return res.json();
        })
        .then((data: ExecutionResult) => {
          // 特定脚本状态调整
          if (
            data.scriptId === "orders-sync-daily" &&
            data.status === "success" &&
            Array.isArray(data.findings) &&
            data.findings.length > 0
          ) {
            data.statusType = "attention_needed";
          }
          setResult(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("获取结果详情失败:", err);
          setError(err.message);
          setLoading(false);
        });
    } else {
      setError("缺少结果ID参数");
      setLoading(false);
    }
  }, [resultId, retryCount]);

  // 用于格式化日期的工具函数，处理可能的无效日期
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString(
        language === "en" ? "en-US" : "zh-CN",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: language === "en",
        },
      );
    } catch {
      return dateString || (language === "en" ? "Unknown time" : "未知时间");
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setRetryCount((prev) => prev + 1);
  };

  const handleGoToDashboard = () => {
    // 直接导航到仪表盘
    router.push("/");
  };

  // AI分析错误函数
  const handleAnalyzeError = async () => {
    if (!result) {
      return;
    }

    setIsAnalyzingError(true);
    try {
      const response = await fetch('/api/ai/analyze-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sql: `-- Script ID: ${result.scriptId}\n-- 执行时间: ${result.executedAt}\n-- 脚本相关信息不可用`,
          errorMessage: result.message 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI分析错误失败');
      }

      const data = await response.json();
      
      if (data.success && data.analysis) {
        setErrorAnalysis(data.analysis);
        setIsErrorAnalysisDialogOpen(true);
      } else {
        throw new Error('AI返回数据格式错误');
      }
    } catch (error) {
      console.error('AI分析错误失败:', error);
      // 可以在这里显示错误提示，但为了简化暂时忽略
    } finally {
      setIsAnalyzingError(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
        <UserHeader />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 dark:border-[#89b4fa] border-r-transparent"></div>
          <p className="mt-4 text-lg text-gray-700 dark:text-[#a5adce]">
            {t.loading}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
        <UserHeader />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-[#f38ba8]/30 rounded-lg text-center p-8">
            <h2 className="text-2xl font-bold text-red-700 dark:text-[#f38ba8] mb-4">
              {t.loadingFailed}
            </h2>
            <p className="text-lg text-red-600 dark:text-[#f38ba8] mb-6">
              {error}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-[var(--primary)] dark:text-[var(--primary-foreground)] dark:hover:brightness-90 transition"
              >
                {t.retry}
              </button>
              <Button
                onClick={handleGoToDashboard}
                variant="outline"
                className="dark:text-[var(--primary)] dark:border-[var(--primary)] dark:hover:bg-[var(--primary)]/10"
              >
                <Home className="h-4 w-4 mr-2" />
                {t.back}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
        <UserHeader />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-yellow-50 dark:bg-[#f9e2af]/30 rounded-lg text-center p-8">
            <h2 className="text-2xl font-bold text-yellow-700 dark:text-[#f9e2af]">
              {t.notFound}
            </h2>
            <p className="mt-4 text-gray-700 dark:text-[#a5adce]">
              {t.noResultFound} {resultId} 的执行结果。
            </p>
            <Button
              onClick={handleGoToDashboard}
              className="mt-6 dark:text-[var(--primary)] dark:border-[var(--primary)] dark:hover:bg-[var(--primary)]/10"
              variant="outline"
            >
              <Home className="h-4 w-4 mr-2" />
              {t.back}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 格式化 findings
  let findingsContent;
  const hasTableData =
    Array.isArray(result.findings) && result.findings.length > 0;

  if (hasTableData && Array.isArray(result.findings)) {
    // 设置表格标题和数据
    const headers = Object.keys(result.findings[0]);
    findingsContent = (
      <div className="space-y-4">
        <div
          ref={scrollContainerRef}
          onScroll={handleContainerScroll}
          className="overflow-x-auto"
        >
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-muted/40 to-muted/20 border-b-2 border-border/30">
                {headers.map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    {header.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {result.findings.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    "transition-colors hover:bg-muted/20",
                    rowIndex % 2 === 0 ? "bg-card" : "bg-muted/10",
                  )}
                >
                  {headers.map((header) => {
                    const value = row[header as keyof typeof row];
                    return (
                      <td
                        key={`${rowIndex}-${header}`}
                        className="px-4 py-3 text-sm text-foreground whitespace-nowrap"
                        title={String(value)}
                      >
                        {value === null ? (
                          <span className="text-muted-foreground italic">
                            NULL
                          </span>
                        ) : typeof value === "object" ? (
                          JSON.stringify(value)
                        ) : (
                          String(value)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 自定义滚动条 */}
        {showScrollBar && (
          <div className="relative h-3 bg-muted/20 rounded-full border border-border/20 shadow-inner">
            <div
              ref={scrollBarRef}
              className={cn(
                "absolute top-0 h-full bg-gradient-to-r from-primary/60 to-primary/80 rounded-full shadow-sm cursor-grab transition-colors duration-200 border border-primary/20",
                isDragging
                  ? "cursor-grabbing bg-primary/90 from-primary/80 to-primary/90"
                  : "hover:from-primary/70 hover:to-primary/90 hover:shadow-md",
              )}
              style={{
                width: `${Math.max(20, ((scrollContainerRef.current?.clientWidth || 0) / (scrollContainerRef.current?.scrollWidth || 1)) * 100)}%`,
                transform: "translateX(0px)",
                transition: isDragging
                  ? "none"
                  : "transform 0.1s ease-out, box-shadow 0.2s ease-out",
              }}
              onMouseDown={handleScrollBarMouseDown}
              title="拖动以横向滚动表格"
            />
          </div>
        )}
      </div>
    );
  } else if (typeof result.findings === "string") {
    findingsContent = (
      <div className="p-6 bg-muted/10 rounded-lg border border-border/20">
        <p className="text-foreground whitespace-pre-wrap leading-relaxed">
          {result.findings}
        </p>
      </div>
    );
  } else {
    findingsContent = (
      <div className="p-8 text-center bg-muted/10 rounded-lg border border-border/20">
        <div className="space-y-3">
          <div className="mx-auto w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center">
            <Database className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">{t.noData}</p>
            <p className="text-sm text-muted-foreground mt-1">{t.noDataDesc}</p>
          </div>
        </div>
      </div>
    );
  }

  // 状态显示逻辑
  // Catppuccin Mocha theme colors: Yellow (#f9e2af), Green (#a6e3a1), Red (#f38ba8)
  const statusText =
    result.statusType === "attention_needed"
      ? t.statusTexts.attentionNeeded
      : result.status === "success"
        ? t.statusTexts.success
        : t.statusTexts.failure;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <UserHeader />
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-8 animate-fadeIn">
          {/* Header Section */}
          <header className="text-center lg:text-left">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-2">
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  {t.executionDetails}
                </h1>
                <p className="text-lg text-muted-foreground">
                  {result.scriptId}
                </p>
              </div>
              {/* <Button
                onClick={handleGoToDashboard}
                variant="outline"
                size="lg"
                className="group shadow-md hover:shadow-lg transition-all duration-300"
              >
                <Home className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                {t.back}
              </Button> */}
            </div>
          </header>

          {/* Execution Summary Card */}
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <div className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40 rounded-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="relative p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t.executionTime}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(result.executedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40 rounded-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="relative p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`p-3 rounded-xl ${
                      result.statusType === "attention_needed"
                        ? "bg-amber-100 dark:bg-amber-950/20 ring-2 ring-amber-200 dark:ring-amber-800/50"
                        : result.status === "success"
                          ? "bg-green-100 dark:bg-green-950/20 ring-2 ring-green-200 dark:ring-green-800/50"
                          : "bg-red-100 dark:bg-red-950/20 ring-2 ring-red-200 dark:ring-red-800/50"
                    }`}
                  >
                    {result.statusType === "attention_needed" ? (
                      <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    ) : result.status === "success" ? (
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {t.status}
                    </h3>
                    <p
                      className={`text-sm font-medium ${
                        result.statusType === "attention_needed"
                          ? "text-amber-600 dark:text-amber-400"
                          : result.status === "success"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {statusText}
                    </p>
                  </div>
                  
                  {/* AI错误分析按钮 - 仅在失败状态下显示 */}
                  {(result.status === "failed" || (result.statusType !== "attention_needed" && result.status !== "success")) && (
                    <Button
                      onClick={handleAnalyzeError}
                      disabled={isAnalyzingError}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white"
                    >
                      {isAnalyzingError ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                          分析中...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          AI分析错误
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40 rounded-xl lg:col-span-2 xl:col-span-1">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="relative p-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">{t.message}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed break-words">
                    {result.message}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Script Metadata Card - 总是显示，包含基本信息 */}
          <div className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40 rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
            <div className="relative p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {t.scriptMetadata ||
                    (language === "en" ? "Script Metadata" : "脚本元数据")}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 脚本ID - 总是显示 */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {t.scriptId}
                  </p>
                  <div className="text-base text-foreground bg-muted/20 rounded-lg p-3 font-mono">
                    <Link 
                      href={`/manage-scripts?scriptId=${encodeURIComponent(result.scriptId)}`}
                      className="flex items-center gap-2 hover:text-primary transition-colors duration-200 group/link"
                    >
                      <span>{result.scriptId}</span>
                      <span 
                        className="text-xs opacity-60 group-hover/link:opacity-100 transition-opacity duration-200" 
                        title={language === "en" ? "Edit Script" : "编辑脚本"}
                      >
                        ✏️
                      </span>
                    </Link>
                  </div>
                </div>

                {/* 结果ID - 总是显示 */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {t.resultId}
                  </p>
                  <p className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3 font-mono break-all">
                    {result._id}
                  </p>
                </div>

                {/* 脚本名称 - 如果存在则显示 */}
                {(language === "en"
                  ? result.name
                  : result.cnName || result.name) && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {t.name || (language === "en" ? "Name" : "名称")}
                    </p>
                    <p className="text-base text-foreground bg-muted/20 rounded-lg p-3">
                      {language === "en"
                        ? result.name
                        : result.cnName || result.name}
                    </p>
                  </div>
                )}

                {/* 作者 - 如果存在则显示 */}
                {result.author && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {t.author || (language === "en" ? "Author" : "作者")}
                    </p>
                    <p className="text-base text-foreground bg-muted/20 rounded-lg p-3">
                      {result.author}
                    </p>
                  </div>
                )}

                {/* 描述 - 如果存在则显示 */}
                {(language === "en"
                  ? result.description
                  : result.cnDescription || result.description) && (
                  <div className="md:col-span-2 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {t.description ||
                        (language === "en" ? "Description" : "描述")}
                    </p>
                    <p className="text-base text-foreground bg-muted/20 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                      {language === "en"
                        ? result.description
                        : result.cnDescription || result.description}
                    </p>
                  </div>
                )}

                {/* 范围 - 如果存在则显示 */}
                {(language === "en"
                  ? result.scope
                  : result.cnScope || result.scope) && (
                  <div className="md:col-span-2 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {t.scope || (language === "en" ? "Scope" : "范围")}
                    </p>
                    <p className="text-base text-foreground bg-muted/20 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                      {language === "en"
                        ? result.scope
                        : result.cnScope || result.scope}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Query Findings Card */}
          <div className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40 rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20">
                    <Search className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {t.queryFindings}
                  </h2>
                </div>

                {/* CSV 导出按钮 */}
                {hasTableData && (
                  <Button
                    onClick={exportToCSV}
                    variant="outline"
                    size="sm"
                    className="group shadow-md hover:shadow-lg transition-all duration-300 h-10 px-4 gap-2"
                    title={t.exportCsvDesc}
                  >
                    <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">{t.exportCsv}</span>
                  </Button>
                )}
              </div>
              <div className="overflow-hidden rounded-xl border border-border/30 shadow-md">
                {findingsContent}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 版本号显示 - 固定在左下角 */}
      <div className="fixed left-6 bottom-6 z-50">
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-mono text-xs text-muted-foreground font-medium">
            v{process.env.NEXT_PUBLIC_APP_VERSION || "0.1.7"}
          </span>
        </div>
      </div>

      {/* AI错误分析结果弹窗 */}
      <AnalysisResultDialog
        isOpen={isErrorAnalysisDialogOpen}
        onOpenChange={setIsErrorAnalysisDialogOpen}
        result={errorAnalysis}
        type="explain"
        title="AI 错误分析结果"
      />
    </div>
  );
}
