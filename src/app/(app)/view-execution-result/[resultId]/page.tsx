"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { WindowStatusBar, WindowToolbar } from "@/components/layout/WindowChrome";
import { cleanRunMessage } from "@/lib/utils/run-message";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/components/common/LanguageProvider";
import { Button } from "@/components/ui/button";
import {
  Home,
  Database,
  Download,
  Brain,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import dynamic from 'next/dynamic';

// Pulls in a syntax highlighter; only load it when an analysis is shown.
const AnalysisResultDialog = dynamic(() => import("@/components/business/ai/AnalysisResultDialog"), { ssr: false });
import Link from "next/link";
import { SkeletonPageHeader, SkeletonTable } from "@/components/common/PageSkeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils/datetime";
import { useMe } from "@/lib/auth/use-me";
import { triageToMarkdown } from "@/lib/ai/triage-format";

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
  const me = useMe();
  const aiAvailable = me?.ai === true;
  // Demo viewers may run the sample checks too; the API has the final say.
  const canRunAgain = !!me && (me.permissions.includes("script:execute") || !!me.demo);
  const [isRunningAgain, setIsRunningAgain] = useState(false);
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

  const formatDate = (dateString: string) => formatDateTime(dateString, language);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setRetryCount((prev) => prev + 1);
  };

  const handleGoToDashboard = () => {
    // 直接导航到仪表盘
    router.push("/dashboard");
  };

  // Triage runs on the server from the run id; the answer is cached on the run.
  const handleAnalyzeError = async () => {
    if (!result) {
      return;
    }

    setIsAnalyzingError(true);
    try {
      const response = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId: result._id, language }),
      });
      const data = await response.json();
      if (!response.ok || !data.triage) {
        throw new Error(data.error || response.statusText);
      }
      setErrorAnalysis(triageToMarkdown(data.triage, language));
      setIsErrorAnalysisDialogOpen(true);
    } catch (error) {
      toast.error(language === "zh" ? "AI 分诊失败" : "AI triage failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsAnalyzingError(false);
    }
  };

  const handleRunAgain = async () => {
    if (!result) return;
    setIsRunningAgain(true);
    try {
      const response = await fetch("/api/run-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId: result.scriptId }),
      });
      const data = await response.json();
      if (!response.ok || !data.mongoResultId) {
        throw new Error(data.message || response.statusText);
      }
      router.push(`/view-execution-result/${data.mongoResultId}`);
    } catch (error) {
      toast.error(language === "zh" ? "执行失败" : "Could not run the check", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsRunningAgain(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8" aria-busy="true">
        <SkeletonPageHeader />
        <Skeleton className="h-[88px] rounded-lg" />
        <Skeleton className="h-[300px] rounded-lg" />
        <SkeletonTable rows={5} />
      </main>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen    ">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-failure/10 rounded-lg text-center p-8">
            <h2 className="text-2xl font-bold text-failure mb-4">
              {t.loadingFailed}
            </h2>
            <p className="text-lg text-failure mb-6">
              {error}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary dark:bg-[var(--primary)] dark:text-[var(--primary-foreground)] dark:hover:brightness-90 transition"
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
      <div className="min-h-screen    ">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-attention/10 rounded-lg text-center p-8">
            <h2 className="text-2xl font-bold text-attention ">
              {t.notFound}
            </h2>
            <p className="mt-4 text-foreground ">
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
    const rows = result.findings;
    const columns = Object.keys(rows[0]);
    // Right-align columns whose non-null values are all numbers (pg returns numerics as strings).
    const numericColumns = new Set(
      columns.filter((column) =>
        rows.every((row) => {
          const value = row[column as keyof typeof row];
          return value === null || value === undefined || (value !== "" && !Number.isNaN(Number(value)));
        }),
      ),
    );
    findingsContent = (
      <div className="space-y-4">
        <div
          ref={scrollContainerRef}
          onScroll={handleContainerScroll}
          className="overflow-x-auto"
        >
          <table className="min-w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b bg-card">
                {columns.map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className={cn(
                      "h-10 px-4 text-[13px] font-normal whitespace-nowrap text-muted-foreground",
                      numericColumns.has(header) ? "text-right" : "text-left",
                    )}
                  >
                    {header.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="transition-colors hover:bg-muted/40">
                  {columns.map((header) => {
                    const value = row[header as keyof typeof row];
                    return (
                      <td
                        key={`${rowIndex}-${header}`}
                        className={cn(
                          "px-4 py-2.5 font-mono text-[13px] whitespace-nowrap",
                          numericColumns.has(header) && "text-right",
                        )}
                      >
                        {value === null || value === undefined ? (
                          <span className="text-muted-foreground italic">
                            {value === null ? "NULL" : "undefined"}
                          </span>
                        ) : typeof value === "object" ? (
                          <span className="text-primary">
                            {JSON.stringify(value)}
                          </span>
                        ) : (
                          <span className="tabular-nums">
                            {String(value)}
                          </span>
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
          <div className="relative h-3 bg-muted/20 rounded-full border border-border/20 mx-4">
            <div
              ref={scrollBarRef}
              className={cn(
                "absolute top-0 h-full rounded-full cursor-grab transition-colors duration-200 border border-primary/20",
                isDragging
                  ? "cursor-grabbing bg-primary/90  "
                  : "  "
              )}
              style={{
                width: `${Math.max(
                  20,
                  ((scrollContainerRef.current?.clientWidth || 0) /
                    (scrollContainerRef.current?.scrollWidth || 1)) *
                    100
                )}%`,
                transform: "translateX(0px)",
                transition: isDragging
                  ? "none"
                  : "transform 0.1s ease-out, box-shadow 0.2s ease-out",
              }}
              onMouseDown={handleScrollBarMouseDown}
              title={language === "en" ? "Drag to scroll horizontally" : "拖动以横向滚动表格"}
            />
          </div>
        )}
      </div>
    );
  } else if (typeof result.findings === "string") {
    findingsContent = (
      <div className="p-6 bg-muted/10 rounded-lg border border-border/20">
        <p className="text-foreground whitespace-pre-wrap leading-relaxed font-mono">
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

  const tone: "attention_needed" | "success" | "failure" =
    result.statusType === "attention_needed" ? "attention_needed" : result.status === "success" ? "success" : "failure";
  const statusText =
    tone === "attention_needed"
      ? t.statusTexts.attentionNeeded
      : tone === "success"
        ? t.statusTexts.success
        : t.statusTexts.failure;
  const rowCount = Array.isArray(result.findings) ? result.findings.length : null;
  const zh = language === "zh";
  // One sentence that says what happened, before any detail.
  const headline =
    tone === "attention_needed"
      ? rowCount !== null
        ? zh ? `${rowCount} 行需要关注` : `${rowCount} ${rowCount === 1 ? "row needs" : "rows need"} attention`
        : zh ? "发现需要关注的问题" : "Needs attention"
      : tone === "success"
        ? zh ? "通过：没有返回任何行" : "Passed: no rows returned"
        : zh ? "执行失败" : "The check could not run";
  const scriptName = zh ? result.cnName || result.name : result.name;
  const toneText = { attention_needed: "text-attention", success: "text-success", failure: "text-failure" }[tone];

  // "Get Info"-style facts about the run and its check.
  const info: { label: string; value: React.ReactNode; mono?: boolean }[] = [
    { label: t.status, value: <span className={cn("inline-flex items-center gap-1.5", toneText)}><span className={cn("status-dot", `status-dot-${tone}`)} aria-hidden />{statusText}</span> },
    { label: t.executionTime, value: <span className="tabular-nums">{formatDate(result.executedAt)}</span> },
    { label: t.message, value: cleanRunMessage(result.message) },
    {
      label: t.scriptId,
      mono: true,
      value: (
        <Link href={`/manage-scripts?scriptId=${encodeURIComponent(result.scriptId)}`} className="text-primary hover:underline">
          {result.scriptId}
        </Link>
      ),
    },
    ...(scriptName ? [{ label: t.name, value: scriptName }] : []),
    ...((result.description || result.cnDescription)
      ? [{ label: t.description, value: zh ? result.cnDescription || result.description : result.description }]
      : []),
    ...((result.scope || result.cnScope) ? [{ label: t.scope, value: zh ? result.cnScope || result.scope : result.scope }] : []),
    ...(result.author ? [{ label: t.author, value: result.author }] : []),
    { label: t.resultId, value: result._id, mono: true },
  ];

  return (
    <div className="min-h-screen">
      <h1 className="sr-only">{t.executionDetails}</h1>
      <WindowToolbar>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">‹ {zh ? "仪表盘" : "Dashboard"}</Link>
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {(tone === "failure" || tone === "attention_needed") && aiAvailable && (
            <Button size="sm" variant="outline" onClick={handleAnalyzeError} disabled={isAnalyzingError}>
              <Brain />
              {isAnalyzingError ? (zh ? "分诊中…" : "Triaging…") : zh ? "AI 分诊" : "Triage with AI"}
            </Button>
          )}
          {canRunAgain && (
            <Button size="sm" variant="outline" onClick={handleRunAgain} disabled={isRunningAgain}>
              <Play />
              {isRunningAgain ? (zh ? "执行中…" : "Running…") : zh ? "再次执行" : "Run again"}
            </Button>
          )}
          {hasTableData && (
            <Button size="sm" variant="outline" onClick={exportToCSV} title={t.exportCsvDesc}>
              <Download />
              {t.exportCsv}
            </Button>
          )}
        </div>
      </WindowToolbar>
      <WindowStatusBar>
        {scriptName ?? result.scriptId} · {formatDate(result.executedAt)}
        {rowCount !== null && ` · ${zh ? `${rowCount} 行` : `${rowCount} rows`}`}
      </WindowStatusBar>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-12 animate-fadeIn">
          {/* What happened, then the rows that prove it. */}
          <section className="min-w-0 space-y-5 lg:col-span-8">
            <header className="rounded-xl bg-card shadow-border flex items-start gap-3  px-5 py-4">
              <span className={cn("status-dot mt-2", `status-dot-${tone}`)} aria-hidden />
              <div className="min-w-0">
                <p className={cn("font-display text-[26px] leading-tight font-semibold", toneText)}>{headline}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {scriptName ?? result.scriptId} · {formatDate(result.executedAt)}
                </p>
                {tone === "failure" && result.message && (
                  <p className="mt-2 font-mono text-[13px] break-words">{cleanRunMessage(result.message)}</p>
                )}
              </div>
            </header>

            <div className="rounded-xl bg-card shadow-border overflow-hidden " aria-label={t.queryFindings}>
              {findingsContent}
            </div>
          </section>

          {/* A Get Info inspector: everything else about the run. */}
          <aside className="lg:col-span-4">
            <div className="rounded-xl bg-card shadow-border overflow-hidden  lg:sticky lg:top-16">
              <p className="border-b bg-muted px-4 py-2 text-[12px] font-medium text-muted-foreground">{zh ? "简介" : "Info"}</p>
              <dl className="divide-y text-[13px]">
                {info.map((item) => (
                  <div key={item.label} className="grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-2">
                    <dt className="text-muted-foreground">{item.label}</dt>
                    <dd className={cn("min-w-0 break-words", item.mono && "font-mono text-[12px]")}>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      </div>

      {/* AI错误分析结果弹窗 */}
      {isErrorAnalysisDialogOpen && (
        <AnalysisResultDialog
          isOpen={isErrorAnalysisDialogOpen}
          onOpenChange={setIsErrorAnalysisDialogOpen}
          result={errorAnalysis}
          type="explain"
          title={language === "zh" ? "AI 分诊" : "AI triage"}
        />
      )}
    </div>
  );
}
