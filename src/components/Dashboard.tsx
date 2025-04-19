"use client"

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  RefreshCw,
} from 'lucide-react';
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useLanguage } from '@/components/ClientLayoutWrapper';

// Import shadcn UI components
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Import subcomponents and types from dashboard folder
import {
  Check,
  CheckStatus,
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
    return <LoadingError error={error} t={t} />;
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

        <StatsCards 
          nextScheduled={nextScheduled}
          successCount={successCount}
          failureCount={failureCount}
          allChecksCount={allChecksCount}
          successRate={successRate}
          language={language}
          t={t}
        />

        <ManualTrigger 
          availableScripts={availableScripts}
          selectedScriptId={selectedScriptId}
          selectedScript={selectedScript}
          isTriggering={isTriggering}
          isFetchingScripts={isFetchingScripts}
          loading={loading}
          triggerMessage={triggerMessage}
          triggerMessageType={triggerMessageType}
          language={language}
          t={t}
          setSelectedScriptId={setSelectedScriptId}
          handleTriggerCheck={handleTriggerCheck}
        />

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
          language={language}
          t={t}
          toggleExpand={toggleExpand}
          setFilterStatus={setFilterStatus}
          setSearchTerm={setSearchTerm}
          setCurrentPage={setCurrentPage}
          requestSort={requestSort}
        />

        <DashboardFooter theme={theme} t={t} />
      </div>
    </div>
  );
};

export default Dashboard;