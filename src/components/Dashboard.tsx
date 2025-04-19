"use client"

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Database,
  Loader2,
  Play,
  List,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useLanguage } from '@/components/ClientLayoutWrapper';

// Import shadcn UI components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// --- Translations Definition ---
const dashboardTranslations = {
  en: {
    // General
    loading: "Loading...",
    refreshing: "Refreshing...",
    refresh: "Refresh",
    errorTitle: "Data Loading Failed",
    errorDescription: "Could not connect or process the request. Check your connection or try again later.",
    errorInfo: "Error Information",
    retry: "Retry Load",
    noData: "No Data",
    // Header
    dashboardTitle: "SQL Check Dashboard",
    dashboardDesc: "Monitor automated SQL check tasks, track data quality and consistency in real-time.",
    // Stats Cards
    nextCheck: "Next Scheduled Check",
    calculating: "Calculating...",
    successRate: "Success Rate",
    checks: "checks",
    failedChecks: "Failed Checks",
    attentionNeeded: "%s% checks require attention",
    // Manual Trigger
    manualTrigger: "Manual Trigger Check",
    selectScriptDesc: "Select and run an SQL check script",
    loadingScripts: "Loading available scripts...",
    selectScriptLabel: "Select script to execute:",
    noScriptDesc: "No description available for this script.",
    runCheck: "Run Check",
    runningCheck: "Running...",
    triggerSuccessTitle: "Execution Successful",
    triggerErrorTitle: "Execution Failed",
    checkTriggered: "Check Triggered",
    checkTriggeredDesc: "Check successfully triggered.",
    triggerFailed: "Trigger Check Failed",
    noScriptsAvailable: "No Check Scripts Available",
    ensureConfigured: "Ensure scripts are correctly configured and deployed.",
    // History Table
    historyTitle: "Check History",
    historyDesc: "Showing results for the last %s checks",
    searchPlaceholder: "Search script name or message...",
    clearSearch: "Clear",
    filterAll: "All",
    filterSuccess: "Success",
    filterFailed: "Failure",
    tableStatus: "Status",
    tableScriptName: "Script Name",
    tableExecutionTime: "Execution Time",
    tableFindings: "Findings/Message",
    tableActions: "Actions",
    noMatchingRecords: "No matching check records found",
    clearFilters: "Clear Filters",
    // Row Actions
    collapse: "Collapse",
    expand: "Details",
    viewDetailsSidebar: "View Details in Sidebar",
    // Detail View (Sheet & Expanded Row)
    checkDetails: "Check Details",
    executionStatus: "Execution Status:",
    executionMessage: "Execution Message:",
    findings: "Findings:",
    rawResults: "Raw Query Results:",
    noRawData: "No raw data",
    viewGitHubAction: "View GitHub Action",
    noMessage: "No message",
    // Footer
    footerSystem: "SQL Check System",
    footerInfo: "Automated checks driven by GitHub Actions, data stored in MongoDB.",
    footerTheme: "Current Theme: %s",
    previous: "Previous",
    next: "Next",
    pageInfo: "Page %s of %s",
  },
  zh: {
    // General
    loading: "加载中...",
    refreshing: "刷新中...",
    refresh: "刷新",
    errorTitle: "数据加载失败",
    errorDescription: "无法连接到服务器或处理请求时出错。请检查您的网络连接或稍后重试。",
    errorInfo: "错误信息",
    retry: "重试加载",
    noData: "无数据",
    // Header
    dashboardTitle: "SQL 检查仪表盘",
    dashboardDesc: "实时监控自动化 SQL 检查任务执行情况，追踪数据质量和一致性。",
    // Stats Cards
    nextCheck: "下次计划检查",
    calculating: "计算中...",
    successRate: "成功率",
    checks: "次检查",
    failedChecks: "失败检查",
    attentionNeeded: "%s% 的检查需要关注",
    // Manual Trigger
    manualTrigger: "手动触发检查",
    selectScriptDesc: "选择并运行SQL检查脚本",
    loadingScripts: "加载可用脚本...",
    selectScriptLabel: "选择要执行的脚本:",
    noScriptDesc: "此脚本没有描述信息。",
    runCheck: "执行检查",
    runningCheck: "执行中...",
    triggerSuccessTitle: "执行成功",
    triggerErrorTitle: "执行失败",
    checkTriggered: "检查已触发",
    checkTriggeredDesc: "检查已成功触发。",
    triggerFailed: "触发检查失败",
    noScriptsAvailable: "没有可用的检查脚本",
    ensureConfigured: "请确保脚本已正确配置并部署。",
    // History Table
    historyTitle: "历史检查记录",
    historyDesc: "显示最近 %s 次检查的详细结果",
    searchPlaceholder: "搜索脚本名称或消息...",
    clearSearch: "清除",
    filterAll: "全部",
    filterSuccess: "成功",
    filterFailed: "失败",
    tableStatus: "状态",
    tableScriptName: "脚本名称",
    tableExecutionTime: "执行时间",
    tableFindings: "发现/消息",
    tableActions: "操作",
    noMatchingRecords: "暂无匹配的检查记录",
    clearFilters: "清除筛选条件",
    // Row Actions
    collapse: "收起",
    expand: "详情",
    viewDetailsSidebar: "在侧边栏查看详情",
    // Detail View (Sheet & Expanded Row)
    checkDetails: "检查详情",
    executionStatus: "执行状态:",
    executionMessage: "执行消息:",
    findings: "发现:",
    rawResults: "原始查询结果:",
    noRawData: "无原始数据",
    viewGitHubAction: "查看 GitHub Action",
    noMessage: "无消息",
    // Footer
    footerSystem: "SQL 检查系统",
    footerInfo: "自动化检查由 GitHub Actions 驱动，数据存储于 MongoDB。",
    footerTheme: "当前主题: %s",
    previous: "上一页",
    next: "下一页",
    pageInfo: "第 %s 页 / 共 %s 页",
  }
};

// Type for translation keys
type DashboardTranslationKeys = keyof typeof dashboardTranslations['en'];

// --- Constants ---
const CheckStatus = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const;

const ITEMS_PER_PAGE = 10;

// --- Interfaces ---
interface Check {
  _id: string;
  script_name: string;
  execution_time: string;
  status: typeof CheckStatus[keyof typeof CheckStatus];
  message: string;
  findings: string;
  raw_results: Record<string, unknown>[];
  github_run_id?: string | number;
}

interface ScriptInfo {
  id: string;
  name: string;
  description: string;
  cn_name?: string;
  cn_description?: string;
}

// --- Helper Components ---
const formatDate = (dateString: string, locale: string = 'en-US') => {
  const date = new Date(dateString);
  // Adjust locale based on language context
  const effectiveLocale = locale.startsWith('zh') ? 'zh-CN' : 'en-US';
  return date.toLocaleString(effectiveLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const RawResultsTable = ({ results, noDataText }: { results: Record<string, unknown>[], noDataText: string }) => {
  if (!results || results.length === 0) {
    return <p className="text-sm text-muted-foreground italic mt-2">{noDataText}</p>;
  }
  const headers = Object.keys(results[0]);
  return (
    <div className="overflow-x-auto mt-2 rounded-md border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/70">
            {headers.map((header) => (
              <TableHead key={header} className="py-2 px-3 text-xs font-medium">{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((row, index) => (
            <TableRow key={index} className="hover:bg-muted/30 transition-colors">
              {headers.map((header) => (
                <TableCell key={header} className="py-2 px-3 text-xs">
                  {typeof row[header] === 'string' || typeof row[header] === 'number' || typeof row[header] === 'boolean'
                    ? String(row[header])
                    : JSON.stringify(row[header])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const SkeletonCard = () => (
  <Card>
    <CardHeader className="space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-6 w-1/2" />
    </CardHeader>
    <CardContent className="space-y-2">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const SkeletonTable = () => (
  <Card>
    <CardHeader className="space-y-2">
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-4 w-2/5" />
    </CardHeader>
    <CardContent className="space-y-4">
      {Array(ITEMS_PER_PAGE).fill(0).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </CardContent>
  </Card>
);

// --- Main Component ---
const Dashboard = () => {
  // --- State Hooks ---
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextScheduled, setNextScheduled] = useState<Date | null>(null);
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Check | '';
    direction: 'ascending' | 'descending';
  }>({ key: 'execution_time', direction: 'descending' });
  const [availableScripts, setAvailableScripts] = useState<ScriptInfo[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [isFetchingScripts, setIsFetchingScripts] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);
  const [triggerMessageType, setTriggerMessageType] = useState<'success' | 'error' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // --- Context Hooks ---
  const { theme } = useTheme();
  const { language } = useLanguage();

  // --- Translation Helper ---
  const t = useCallback((key: DashboardTranslationKeys): string => {
    const langTranslations = dashboardTranslations[language] || dashboardTranslations.en;
    return langTranslations[key] || key;
  }, [language]);

  // --- Data Fetching ---
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setIsFetchingScripts(true);
    setError(null);
    setTriggerMessage(null);
    setTriggerMessageType(null);
    setIsRefreshing(true);
    setCurrentPage(1);

    try {
      const historyPromise = fetch('/api/check-history').then(res => {
        if (!res.ok) throw new Error(`${t('errorInfo')}: ${res.status} ${res.statusText}`);
        return res.json();
      });

      const scriptsPromise = fetch('/api/list-scripts').then(res => {
        if (!res.ok) throw new Error(`${t('errorInfo')} (Scripts): ${res.status} ${res.statusText}`);
        return res.json();
      });

      const [historyData, scriptsData]: [Check[], ScriptInfo[]] = await Promise.all([historyPromise, scriptsPromise]);

      setChecks(historyData);
      setAvailableScripts(scriptsData);

      if (scriptsData.length > 0 && !selectedScriptId) {
        setSelectedScriptId(scriptsData[0].id);
      }

    } catch (err) {
      console.error("Failed to fetch initial data:", err);
      setError(err instanceof Error ? err.message : t('errorTitle'));
    } finally {
      setLoading(false);
      setIsFetchingScripts(false);
      setIsRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScriptId, t]);

  useEffect(() => {
    loadInitialData();

    const now = new Date();
    const nextRun = new Date();
    nextRun.setUTCHours(19, 0, 0, 0);
    if (nextRun < now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    setNextScheduled(nextRun);

    const style = document.createElement('style');
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
  }, [loadInitialData]);

  const toggleExpand = (checkId: string) => {
    setExpandedCheckId(expandedCheckId === checkId ? null : checkId);
  };

  const handleTriggerCheck = useCallback(async () => {
    if (!selectedScriptId || isTriggering) return;
    setIsTriggering(true);
    setTriggerMessage(null);
    setTriggerMessageType(null);
    try {
      const response = await fetch('/api/run-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: selectedScriptId })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `${t('triggerFailed')}: ${response.status} ${response.statusText}`);
      }
      const successMessage = result.message || t('checkTriggeredDesc');
      setTriggerMessage(successMessage);
      setTriggerMessageType('success');
      toast.success(t('checkTriggered'), {
        description: successMessage,
        duration: 5000,
      });
      setTimeout(loadInitialData, 3000);
    } catch (err) {
      console.error("Failed to trigger check:", err);
      const errorMessage = err instanceof Error ? err.message : t('triggerFailed');
      setTriggerMessage(errorMessage);
      setTriggerMessageType('error');
      toast.error(t('triggerFailed'), {
        description: errorMessage,
        duration: 8000,
      });
    } finally {
      setIsTriggering(false);
      setTimeout(() => {
        setTriggerMessage(null);
        setTriggerMessageType(null);
      }, 8000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScriptId, loadInitialData, t]);

  const requestSort = (key: keyof Check) => {
    if (sortConfig.key === key) {
      setSortConfig({ key, direction: sortConfig.direction === 'ascending' ? 'descending' : 'ascending' });
    } else {
      setSortConfig({ key, direction: 'descending' });
    }
    setCurrentPage(1);
  };

  const filteredAndSortedChecks = React.useMemo(() => {
    let filtered = filterStatus
      ? checks.filter(check => check.status === filterStatus)
      : checks;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(check => 
        check.script_name.toLowerCase().includes(term) || 
        (check.message && check.message.toLowerCase().includes(term)) ||
        (check.findings && check.findings.toLowerCase().includes(term))
      );
    }
    if (sortConfig.key !== '') {
      filtered = [...filtered].sort((a, b) => {
        const key = sortConfig.key as keyof Check;
        if (key === 'execution_time') {
          return sortConfig.direction === 'ascending' 
            ? new Date(a[key] as string).getTime() - new Date(b[key] as string).getTime()
            : new Date(b[key] as string).getTime() - new Date(a[key] as string).getTime();
        } else {
          const aValue = String(a[key] || '');
          const bValue = String(b[key] || '');
          return sortConfig.direction === 'ascending' 
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

  const selectedScript = availableScripts.find(s => s.id === selectedScriptId);
  const successCount = checks.filter(c => c.status === CheckStatus.SUCCESS).length;
  const failureCount = checks.filter(c => c.status === CheckStatus.FAILURE).length;
  const allChecksCount = checks.length;
  const successRate = allChecksCount > 0 ? Math.round((successCount / allChecksCount) * 100) : 0;

  if (loading && checks.length === 0) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 animate-fadeIn">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between pb-6 border-b">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonTable />
          <SkeletonTable />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle className="text-center text-destructive">{t('errorTitle')}</CardTitle>
            <CardDescription className="text-center">
              {t('errorDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>{t('errorInfo')}</AlertTitle>
              <AlertDescription className="font-mono text-sm break-all">
                {error}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button 
              onClick={() => window.location.reload()}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('retry')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-4 pb-8 px-3 sm:px-5 lg:px-6 animate-fadeIn">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="pb-4 mb-2 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                <Database className="h-6 w-6 sm:h-7 sm:w-7 text-primary flex-shrink-0" />
                {t('dashboardTitle')}
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-muted-foreground max-w-3xl">
                {t('dashboardDesc')}
              </p>
            </div>
            <Button
              onClick={loadInitialData}
              disabled={loading || isRefreshing}
              variant="outline"
              size="sm"
              className="relative shadow-sm hover:shadow transition-all"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? t('refreshing') : t('refresh')}
              {isRefreshing && (
                <span className="absolute inset-0 rounded-md bg-primary/10 animate-pulse"></span>
              )}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          <Card className="transition-all duration-300 hover:shadow-md border-l-4 border-l-blue-500 dark:border-l-blue-400 shadow-sm hover:translate-y-[-2px]">
            <CardHeader className="pb-1.5 pt-3 px-4">
              <CardTitle className="text-sm text-muted-foreground font-normal">{t('nextCheck')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3.5">
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-2.5 rounded-full">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-semibold">
                    {nextScheduled ? formatDate(nextScheduled.toISOString(), language) : t('calculating')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-md border-l-4 border-l-emerald-500 dark:border-l-emerald-400 shadow-sm hover:translate-y-[-2px]">
            <CardHeader className="pb-1.5 pt-3 px-4">
              <CardTitle className="text-sm text-muted-foreground font-normal">{t('successRate')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3.5">
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-500/10 p-2.5 rounded-full">
                  <BarChart2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-baseline space-x-2">
                    <p className="text-xl sm:text-2xl font-semibold">{successRate}%</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">({successCount}/{allChecksCount})</p>
                  </div>
                  <Progress className="h-1.5" value={successRate} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-md border-l-4 border-l-amber-500 dark:border-l-amber-400 shadow-sm hover:translate-y-[-2px]">
            <CardHeader className="pb-1.5 pt-3 px-4">
              <CardTitle className="text-sm text-muted-foreground font-normal">{t('failedChecks')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3.5">
              <div className="flex items-center space-x-3">
                <div className="bg-amber-500/10 p-2.5 rounded-full">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-baseline space-x-2">
                    <p className="text-xl sm:text-2xl font-semibold">{failureCount}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">/ {allChecksCount} {t('checks')}</p>
                  </div>
                  {failureCount > 0 && allChecksCount > 0 && (
                    <p className="text-red-500 text-xs font-medium">
                      {t('attentionNeeded').replace('%s', String(Math.round((failureCount / allChecksCount) * 100)))}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden border-t-4 border-t-primary shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="px-5 py-4 bg-card/50">
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5 text-primary" />
              {t('manualTrigger')}
            </CardTitle>
            <CardDescription className="mt-1">
              {t('selectScriptDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {isFetchingScripts ? (
              <div className="flex items-center text-muted-foreground space-x-2">
                <Loader2 className="animate-spin h-5 w-5" />
                <span>{t('loadingScripts')}</span>
              </div>
            ) : availableScripts.length > 0 ? (
              <div className="space-y-4">
                <div className="grid gap-1.5">
                  <label htmlFor="script-select" className="text-sm font-medium">
                    {t('selectScriptLabel')}
                  </label>
                  <select
                    id="script-select"
                    value={selectedScriptId}
                    onChange={(e) => setSelectedScriptId(e.target.value)}
                    disabled={isTriggering || loading}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {availableScripts.map((script) => {
                      const displayName = language === 'zh' && script.cn_name
                        ? script.cn_name 
                        : script.name;
                      
                      return (
                        <option key={script.id} value={script.id}>
                          {displayName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedScript && (
                  <div className="bg-muted/50 p-2.5 rounded-md text-sm text-muted-foreground italic border border-muted/80">
                    {language === 'zh' && selectedScript.cn_description 
                      ? selectedScript.cn_description 
                      : selectedScript.description || t('noScriptDesc')}
                  </div>
                )}

                <Button
                  onClick={handleTriggerCheck}
                  disabled={!selectedScriptId || isTriggering || loading}
                  className="w-full shadow-sm hover:shadow transition-all"
                >
                  {isTriggering ? (
                    <>
                      <Loader2 className="animate-spin mr-1.5 h-4 w-4" />
                      {t('runningCheck')}
                    </>
                  ) : (
                    <>
                      <Play className="mr-1.5 h-4 w-4" />
                      {t('runCheck')}
                    </>
                  )}
                </Button>

                {triggerMessage && (
                  <Alert variant={triggerMessageType === 'error' ? "destructive" : "default"} className="mt-3 shadow-sm">
                    <AlertTitle>
                      {triggerMessageType === 'error' ? t('triggerErrorTitle') : t('triggerSuccessTitle')}
                    </AlertTitle>
                    <AlertDescription>
                      {triggerMessage}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
               <div className="text-center py-5 px-4 bg-muted/50 rounded-lg border border-dashed">
                  <Database className="h-9 w-9 text-muted-foreground mx-auto mb-2.5" />
                  <p className="font-medium">{t('noScriptsAvailable')}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t('ensureConfigured')}</p>
               </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="px-5 py-4 bg-card/50 border-b border-border/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  {t('historyTitle')}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t('historyDesc').replace('%s', String(allChecksCount))}
                </CardDescription>
              </div>

              <div className="w-full sm:w-auto space-y-3">
                <div className="flex flex-wrap items-center gap-1.5 justify-between sm:justify-end">
                  <Button
                    variant={filterStatus === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setFilterStatus(null); setCurrentPage(1); }}
                    className="h-7 px-2 gap-1 text-xs transition-all duration-200 shadow-sm"
                  >
                    <Filter size={12} /> {t('filterAll')} <Badge variant="secondary" className="ml-0.5 h-4 text-[10px] px-1">{allChecksCount}</Badge>
                  </Button>
                  <Button
                    variant={filterStatus === CheckStatus.SUCCESS ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setFilterStatus(CheckStatus.SUCCESS); setCurrentPage(1); }}
                    className="h-7 px-2 gap-1 text-xs transition-all duration-200 shadow-sm"
                  >
                    <CheckCircle size={12} /> {t('filterSuccess')} <Badge variant="secondary" className="ml-0.5 h-4 text-[10px] px-1">{successCount}</Badge>
                  </Button>
                  <Button
                    variant={filterStatus === CheckStatus.FAILURE ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setFilterStatus(CheckStatus.FAILURE); setCurrentPage(1); }}
                    className="h-7 px-2 gap-1 text-xs transition-all duration-200 shadow-sm"
                  >
                    <AlertCircle size={12} /> {t('filterFailed')} <Badge variant="secondary" className="ml-0.5 h-4 text-[10px] px-1">{failureCount}</Badge>
                  </Button>
                </div>
                
                <div className="relative w-full">
                  <div className="flex w-full items-center space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        placeholder={t('searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-9 pl-8 pr-8 text-sm rounded-md border border-input bg-card/50 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:ring-offset-2 shadow-sm"
                      />
                      {searchTerm && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="absolute right-1 top-1 h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80" 
                          onClick={() => setSearchTerm('')}
                        >
                          <span className="sr-only">{t('clearSearch')}</span>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/40">
                    <TableHead className="w-[100px]">{t('tableStatus')}</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => requestSort('script_name')}
                    >
                      <div className="flex items-center">
                        {t('tableScriptName')}
                        {sortConfig.key === 'script_name' && (
                          <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="hidden md:table-cell cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => requestSort('execution_time')}
                    >
                      <div className="flex items-center">
                        {t('tableExecutionTime')}
                        {sortConfig.key === 'execution_time' && (
                          <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell max-w-xs">{t('tableFindings')}</TableHead>
                    <TableHead className="text-center">{t('tableActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedChecks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <div className="flex flex-col items-center">
                          <Database className="h-12 w-12 text-muted-foreground mb-3" />
                          <p className="font-medium">{t('noMatchingRecords')}</p>
                          {filterStatus && (
                            <Button
                              onClick={() => setFilterStatus(null)}
                              variant="link"
                              className="mt-1.5"
                            >
                              {t('clearFilters')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {paginatedChecks.map((check) => (
                    <React.Fragment key={check._id}>
                      <TableRow className={cn(
                        "transition-colors hover:bg-muted/20",
                        expandedCheckId === check._id ? "bg-muted/60" : ""
                      )}>
                        <TableCell>
                          {check.status === CheckStatus.SUCCESS ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              {t('filterSuccess')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                              <AlertCircle className="h-3.5 w-3.5 mr-1" />
                              {t('filterFailed')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {check.script_name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {formatDate(check.execution_time, language)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell max-w-xs truncate" title={check.findings || check.message || t('noData')}>
                          {check.findings || check.message || <span className="italic text-muted-foreground">{t('noData')}</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1.5">
                            <Button
                              variant={expandedCheckId === check._id ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleExpand(check._id)}
                              className="h-7 px-2 text-xs shadow-sm"
                            >
                              {expandedCheckId === check._id ? (
                                <><ChevronUp size={12} className="mr-1"/>{t('collapse')}</>
                              ) : (
                                <><ChevronDown size={12} className="mr-1"/>{t('expand')}</>
                              )}
                            </Button>
                            
                            <Sheet>
                              <SheetTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 shadow-sm"
                                >
                                  <ExternalLink size={12} />
                                </Button>
                              </SheetTrigger>
                              <SheetContent className="overflow-y-auto">
                                <SheetHeader className="border-b pb-4">
                                  <SheetTitle className="text-xl flex items-center gap-2">
                                    {check.status === CheckStatus.SUCCESS ? (
                                      <CheckCircle className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <AlertCircle className="h-5 w-5 text-red-500" />
                                    )}
                                    {t('checkDetails')}
                                  </SheetTitle>
                                  <SheetDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm">
                                    <span className="font-semibold">{check.script_name}</span>
                                    <span className="hidden sm:inline text-muted-foreground">•</span>
                                    <span className="text-muted-foreground">{formatDate(check.execution_time, language)}</span>
                                  </SheetDescription>
                                </SheetHeader>
                                <div className="space-y-6 py-6">
                                  <div className="bg-card rounded-lg border shadow-sm p-4">
                                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                                      {check.status === CheckStatus.SUCCESS ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                      )}
                                      {t('executionStatus')}
                                    </h4>
                                    {check.status === CheckStatus.SUCCESS ? (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                        {t('filterSuccess')}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                        {t('filterFailed')}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="bg-card rounded-lg border shadow-sm p-4">
                                    <h4 className="text-sm font-semibold mb-2">{t('executionMessage')}</h4>
                                    <div className="bg-muted/50 p-3 rounded-md text-sm break-words border">
                                      {check.message || <span className="italic text-muted-foreground">{t('noMessage')}</span>}
                                    </div>
                                  </div>
                                  
                                  {check.findings && (
                                    <div className="bg-card rounded-lg border shadow-sm p-4">
                                      <h4 className="text-sm font-semibold mb-2">{t('findings')}</h4>
                                      <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md text-sm text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 break-words">
                                        {check.findings}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="bg-card rounded-lg border shadow-sm p-4">
                                    <h4 className="text-sm font-semibold mb-2">{t('rawResults')}</h4>
                                    <RawResultsTable results={check.raw_results} noDataText={t('noRawData')} />
                                  </div>
                                  
                                  {check.github_run_id && (
                                    <div className="flex justify-end mt-2">
                                      <Button asChild variant="outline" size="sm" className="shadow-sm hover:bg-primary/10 transition-colors">
                                        <a
                                          href={`https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO || 'your-org/your-repo'}/actions/runs/${check.github_run_id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center"
                                        >
                                          {t('viewGitHubAction')}
                                          <ExternalLink size={12} className="ml-1.5" />
                                        </a>
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </SheetContent>
                            </Sheet>
                          </div>
                        </TableCell>
                      </TableRow>

                      {expandedCheckId === check._id && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={5} className="p-4">
                            <Card className="shadow-sm border">
                              <CardContent className="space-y-5 pt-5 px-4 pb-4">
                                <div className="bg-card rounded-lg border shadow-sm p-4">
                                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                                    {check.status === CheckStatus.SUCCESS ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <AlertCircle className="h-4 w-4 text-red-500" />
                                    )}
                                    {t('executionStatus')}
                                  </h4>
                                  {check.status === CheckStatus.SUCCESS ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                      {t('filterSuccess')}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                      {t('filterFailed')}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="bg-card rounded-lg border shadow-sm p-4">
                                  <h4 className="text-sm font-semibold mb-2">{t('executionMessage')}</h4>
                                  <div className="bg-muted/50 p-3 rounded-md text-sm break-words border">
                                    {check.message || <span className="italic text-muted-foreground">{t('noMessage')}</span>}
                                  </div>
                                </div>

                                {check.findings && (
                                  <div className="bg-card rounded-lg border shadow-sm p-4">
                                    <h4 className="text-sm font-semibold mb-2">{t('findings')}</h4>
                                    <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md text-sm text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 break-words">
                                      {check.findings}
                                    </div>
                                  </div>
                                )}

                                <div className="bg-card rounded-lg border shadow-sm p-4">
                                  <h4 className="text-sm font-semibold mb-2">{t('rawResults')}</h4>
                                  <RawResultsTable results={check.raw_results} noDataText={t('noRawData')} />
                                </div>

                                {check.github_run_id && (
                                  <div className="flex justify-end mt-2">
                                    <Button asChild variant="outline" size="sm" className="shadow-sm hover:bg-primary/10 transition-colors">
                                      <a
                                        href={`https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO || 'your-org/your-repo'}/actions/runs/${check.github_run_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center"
                                      >
                                        {t('viewGitHubAction')}
                                        <ExternalLink size={12} className="ml-1.5" />
                                      </a>
                                    </Button>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          {totalPages > 1 && (
            <CardFooter className="flex items-center justify-between border-t px-4 py-2.5 text-xs bg-card/50">
              <div className="text-muted-foreground">
                {t('pageInfo').replace('%s', String(currentPage)).replace('%s', String(totalPages))}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-7 px-2 text-xs shadow-sm"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  {t('previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-7 px-2 text-xs shadow-sm"
                >
                  {t('next')}
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>

        <footer className="text-center text-xs text-muted-foreground py-4 border-t">
          <p>{t('footerSystem')} &copy; {new Date().getFullYear()}</p>
          <p className="mt-1">
            {t('footerInfo')}
            <span className="inline-block ml-2 text-primary">
              {t('footerTheme').replace('%s', theme || t('loading'))}
            </span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;