"use client"

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  AreaChart,
  ListChecks,
  Clock,
} from 'lucide-react';
import { toast } from "sonner";
import { useLanguage } from '@/components/ClientLayoutWrapper';
import Link from 'next/link';

// Import shadcn UI components
import { Button } from "@/components/ui/button";

// Import subcomponents and types from dashboard folder
import {
  Check,
  dashboardTranslations,
  DashboardTranslationKeys,
  ITEMS_PER_PAGE,
  ScriptInfo,
} from '@/components/dashboard/types';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { ManualTrigger } from '@/components/dashboard/ManualTrigger';
import { CheckHistory } from '@/components/dashboard/CheckHistory';
import { LoadingError } from '@/components/dashboard/LoadingError';
import { SkeletonCard, SkeletonTable } from '@/components/dashboard/SkeletonComponents';
import { DashboardFooter } from '@/components/dashboard/DashboardFooter';

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
  const { language } = useLanguage();

  // --- Translation Helper ---
  const t = useCallback((key: DashboardTranslationKeys): string => {
    const langTranslations = dashboardTranslations[language] || dashboardTranslations.en;
    return langTranslations[key as keyof typeof langTranslations] || key;
  }, [language]);

  // --- Data Fetching ---
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setIsFetchingScripts(true);
    setIsRefreshing(true);
    setError(null);
    setTriggerMessage(null);
    setTriggerMessageType(null);
    setCurrentPage(1);

    try {
      // 修改API调用：获取完整的历史数据（包含raw_results）和更大的数据集
      const historyPromise = fetch('/api/check-history?limit=400&include_results=true').then(res => {
        if (!res.ok) throw new Error(`${t('errorInfo')}: ${res.status} ${res.statusText}`);
        return res.json();
      });

      const scriptsPromise = fetch('/api/list-scripts').then(res => {
        if (!res.ok) throw new Error(`${t('errorInfo')} (Scripts): ${res.status} ${res.statusText}`);
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return res.json();
        } else {
            console.warn('Received non-JSON response from /api/list-scripts');
            return { data: [] }; // 返回包含空数据数组的对象
        }
      });

      const [historyResponse, scriptsResponse]: [{ data: Check[], meta?: unknown }, { data: ScriptInfo[] }] = await Promise.all([historyPromise, scriptsPromise]);

      // 从响应中提取数据数组
      const historyData = historyResponse.data || [];
      const scriptsDataJSON = scriptsResponse.data || [];
      
      // 记录API返回的元数据（可选）
      if (historyResponse.meta) {
        console.log("History API meta:", historyResponse.meta);
        const meta = historyResponse.meta as { total_count?: number };
        console.log(`API returned ${historyData.length} records out of ${meta.total_count || 'unknown'} total records`);
      }

      const processedScriptsData: ScriptInfo[] = (scriptsDataJSON || []).map(script => ({
        ...script,
        createdAt: script.createdAt ? new Date(script.createdAt) : undefined,
      }));

      setChecks(historyData);
      setAvailableScripts(processedScriptsData);

    } catch (err) {
      console.error("Failed to fetch initial data:", err);
      setError(err instanceof Error ? err.message : t('errorTitle'));
    } finally {
      setLoading(false);
      setIsFetchingScripts(false);
      setIsRefreshing(false);
    }
  }, [t]);

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

  useEffect(() => {
    // Only set a default if no script is currently selected AND there are available scripts
    if (!selectedScriptId && availableScripts.length > 0) {
      setSelectedScriptId(availableScripts[0].scriptId);
    }
    // If scripts become unavailable AND a script was previously selected, clear the selection
    else if (selectedScriptId && availableScripts.length === 0) {
      setSelectedScriptId('');
    }
  }, [availableScripts, selectedScriptId]);

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
        body: JSON.stringify({ 
          scriptId: selectedScriptId,
          language
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `${t('triggerFailed')}: ${response.status} ${response.statusText}`);
      }
      const successMessage = result.localizedMessage || result.message || t('checkTriggeredDesc');
      setTriggerMessage(successMessage);
      setTriggerMessageType('success');
      toast.success(t('checkTriggered'), {
        description: successMessage,
        duration: 5000,
      });
      setTimeout(loadInitialData, 3000);
    } catch (err) {
      console.error("Failed to trigger check:", err);
      const errorMessage = err instanceof Error 
        ? (err.message || t('triggerFailed')) 
        : t('triggerFailed');
      // 尝试提取本地化错误消息
      let localizedErrorMessage = errorMessage;
      try {
        if (err instanceof Error && err.cause && typeof err.cause === 'object') {
          const cause = err.cause as Record<string, unknown>;
          if ('localizedMessage' in cause && typeof cause.localizedMessage === 'string') {
            localizedErrorMessage = cause.localizedMessage;
          }
        }
      } catch (extractError) {
        console.error("Error extracting localized message:", extractError);
        // 出错时使用默认错误消息
      }
      
      setTriggerMessage(localizedErrorMessage);
      setTriggerMessageType('error');
      toast.error(t('triggerFailed'), {
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
  }, [selectedScriptId, t, isTriggering, language, loadInitialData]);

  const requestSort = (key: keyof Check) => {
    if (sortConfig.key === key) {
      setSortConfig({ key, direction: sortConfig.direction === 'ascending' ? 'descending' : 'ascending' });
    } else {
      setSortConfig({ key, direction: 'descending' });
    }
    setCurrentPage(1);
  };

  const filteredAndSortedChecks = React.useMemo(() => {
    let filtered = checks;
    
    // 根据不同的筛选状态进行过滤
    if (filterStatus === "success") {
      filtered = filtered.filter(check => check.status === "success");
    } else if (filterStatus === "failure") {
      filtered = filtered.filter(check => check.status === "failure");
    } else if (filterStatus === "attention_needed") {
      filtered = filtered.filter(check => check.statusType === "attention_needed");
    }
    // filterStatus === null 时显示所有记录
    
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

  const selectedScript = React.useMemo(() => 
    availableScripts.find(s => s.scriptId === selectedScriptId)
  , [availableScripts, selectedScriptId]);

  const successCount = checks.filter(c => c.status === "success").length;
  const failureCount = checks.filter(c => c.status === "failure").length;
  const needsAttentionCount = checks.filter(c => c.statusType === "attention_needed").length;
  const allChecksCount = checks.length;
  const successRate = allChecksCount > 0 ? Math.round((successCount / allChecksCount) * 100) : 0;

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
                  {t('dashboardTitle')}
                </h1>
                {nextScheduled && (
                  <p className="text-base text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('nextScheduledCheck')}: {nextScheduled.toLocaleString(language, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <Link href="/data-analysis" passHref legacyBehavior>
                  <Button variant="outline" size="lg" className="group shadow-md hover:shadow-lg transition-all duration-300" asChild>
                    <a>
                      <AreaChart className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                      {t('dataAnalysisButton')}
                    </a>
                  </Button>
                </Link>
                <Button 
                  onClick={loadInitialData} 
                  disabled={isRefreshing} 
                  variant="outline" 
                  size="lg"
                  className="group shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <RefreshCw className={`mr-2 h-5 w-5 transition-transform ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-45'}`} />
                  {isRefreshing ? t('refreshingStatusText') : t('refreshDataButton')}
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
                  {t('checkHistoryTitle')}
                </h2>
              </div>
              <Link href="/manage-scripts" passHref legacyBehavior>
                <Button variant="outline" size="lg" className="group shadow-md hover:shadow-lg transition-all duration-300" asChild>
                  <a>
                    <ListChecks className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    {t('manageScriptsButton')}
                  </a>
                </Button>
              </Link>
            </div>

            <CheckHistory 
              paginatedChecks={paginatedChecks}
              allChecksCount={allChecksCount}
              totalPages={totalPages}
              currentPage={currentPage}
              filterStatus={filterStatus}
              searchTerm={searchTerm}
              expandedCheckId={expandedCheckId}
              sortConfig={sortConfig}
              successCount={successCount} 
              failureCount={failureCount} 
              needsAttentionCount={needsAttentionCount}
              language={language}
              t={t}
              toggleExpand={toggleExpand}
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
            v{process.env.NEXT_PUBLIC_APP_VERSION || '0.1.7'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;