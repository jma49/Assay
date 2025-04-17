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
  ExternalLink, // Added for external links
  Filter, // Added for filter section
  RefreshCw, // Added for reload button
} from 'lucide-react';

// Keep CheckStatus if still relevant, or adjust based on API data
const CheckStatus = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const;

// Update Check interface to match API response
interface Check {
  _id: string;
  script_name: string;
  execution_time: string; // API returns Date, but fetch converts to string
  status: typeof CheckStatus[keyof typeof CheckStatus];
  message: string;
  findings: string;
  raw_results: Record<string, unknown>[];
  github_run_id?: string | number;
}

// Define the type for the script info fetched from the API
interface ScriptInfo {
  id: string;
  name: string;
  description: string;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit', // Added seconds for more precision
  });
};

// Helper to render raw results as a simple table
const RawResultsTable = ({ results }: { results: Record<string, unknown>[] }) => {
  if (!results || results.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-2">无原始数据</p>;
  }

  const headers = Object.keys(results[0]);

  return (
    <div className="overflow-x-auto mt-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
      <table className="min-w-full text-xs divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 tracking-wide">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
          {results.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
              {headers.map((header) => (
                <td key={header} className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                  {/* Display basic types, stringify others */}
                  {typeof row[header] === 'string' || typeof row[header] === 'number' || typeof row[header] === 'boolean'
                    ? String(row[header])
                    : JSON.stringify(row[header])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Dashboard = () => {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextScheduled, setNextScheduled] = useState<Date | null>(null);
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const [availableScripts, setAvailableScripts] = useState<ScriptInfo[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [isFetchingScripts, setIsFetchingScripts] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);
  const [triggerMessageType, setTriggerMessageType] = useState<'success' | 'error' | null>(null); // For styling message

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setIsFetchingScripts(true);
    setError(null);
    setTriggerMessage(null);
    setTriggerMessageType(null);

    try {
      const historyPromise = fetch('/api/check-history').then(res => {
        if (!res.ok) throw new Error(`API Error (History): ${res.status} ${res.statusText}`);
        return res.json();
      });

      const scriptsPromise = fetch('/api/list-scripts').then(res => {
        if (!res.ok) throw new Error(`API Error (Scripts): ${res.status} ${res.statusText}`);
        return res.json();
      });

      const [historyData, scriptsData]: [Check[], ScriptInfo[]] = await Promise.all([historyPromise, scriptsPromise]);

      // Sort history data by execution time descending
      const sortedHistory = historyData.sort((a, b) => new Date(b.execution_time).getTime() - new Date(a.execution_time).getTime());
      setChecks(sortedHistory);

      setAvailableScripts(scriptsData);

      if (scriptsData.length > 0 && !selectedScriptId) { // Only set default if not already set
        setSelectedScriptId(scriptsData[0].id);
      }

    } catch (err) {
      console.error("Failed to fetch initial data:", err);
      setError(err instanceof Error ? err.message : '获取初始化数据失败');
    } finally {
      setLoading(false);
      setIsFetchingScripts(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    const now = new Date();
    const nextRun = new Date();
    nextRun.setUTCHours(19, 0, 0, 0); // Assuming UTC 19:00 is the target
    if (nextRun < now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    setNextScheduled(nextRun);

    // Optional: Set up polling or SSE for real-time updates if needed
    // const intervalId = setInterval(loadInitialData, 60000); // Refresh every minute
    // return () => clearInterval(intervalId);

  }, [loadInitialData]); // Add memoized loadInitialData to dependency array

  const toggleExpand = (checkId: string) => {
    setExpandedCheckId(expandedCheckId === checkId ? null : checkId);
  };

  const handleTriggerCheck = async () => {
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

      const result = await response.json(); // Try to parse JSON regardless of status

      if (!response.ok) {
        throw new Error(result.message || `API 错误: ${response.status} ${response.statusText}`);
      }

      console.log('Trigger API response:', result);
      setTriggerMessage(result.message || '检查已成功触发。');
      setTriggerMessageType('success');

      // Refresh history after a short delay to allow processing
      setTimeout(loadInitialData, 3000); // Refresh after 3 seconds

    } catch (err) {
      console.error("Failed to trigger check:", err);
      const errorMessage = err instanceof Error ? err.message : '触发检查失败';
      setTriggerMessage(errorMessage);
      setTriggerMessageType('error');
    } finally {
      setIsTriggering(false);
      // Clear message after a longer delay
      setTimeout(() => {
        setTriggerMessage(null);
        setTriggerMessageType(null);
      }, 8000);
    }
  };

  const filteredChecks = filterStatus
    ? checks.filter(check => check.status === filterStatus)
    : checks;

  const selectedScript = availableScripts.find(s => s.id === selectedScriptId);

  // --- Render Logic ---

  if (loading && checks.length === 0) { // Show initial loading only if no data is present yet
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/30 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-5" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">加载仪表盘数据</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">请稍候，正在获取最新检查记录...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-red-50 dark:from-gray-900 dark:to-red-900/30 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl border border-red-200 dark:border-red-700 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-5" />
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">数据加载失败</h2>
          <p className="text-gray-700 dark:text-gray-300 mt-3 mb-6 max-w-md mx-auto">无法连接到服务器或处理请求时出错。请检查您的网络连接或稍后重试。</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-3 rounded-md font-mono break-all">错误: {error}</p>
          <button
            onClick={() => window.location.reload()} // Simple reload for now
            className="mt-8 inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            重试加载
          </button>
        </div>
      </div>
    );
  }

  const successCount = checks.filter(c => c.status === CheckStatus.SUCCESS).length;
  const failureCount = checks.filter(c => c.status === CheckStatus.FAILURE).length;
  const totalChecks = checks.length;
  const successRate = totalChecks > 0 ? Math.round((successCount / totalChecks) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                <Database className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                SQL Check Dashboard
              </h1>
              <p className="mt-2 text-base text-gray-600 dark:text-gray-400 max-w-3xl">
                实时监控自动化 SQL 检查任务执行情况，追踪数据质量和一致性。
              </p>
            </div>
            {/* Optional: Add a refresh button here */}
            <button
              onClick={loadInitialData}
              disabled={loading}
              className="flex-shrink-0 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-wait"
              title="刷新数据"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Next Scheduled Card */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/50 p-3">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">下次计划检查</h3>
                <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                  {nextScheduled ? formatDate(nextScheduled.toISOString()) : '计算中...'}
                </p>
              </div>
            </div>
          </div>

          {/* Success Rate Card */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/50 p-3">
                <BarChart2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">成功率</h3>
                <div className="flex items-baseline mt-1 space-x-2">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{successRate}%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">({successCount}/{totalChecks})</p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700 h-1.5 rounded-full"
                    style={{ width: `${successRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Failure Count Card */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/50 p-3">
                <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">失败检查</h3>
                 <div className="flex items-baseline mt-1 space-x-2">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{failureCount}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">/ {totalChecks} 次检查</p>
                 </div>
                {failureCount > 0 && totalChecks > 0 && (
                  <p className="mt-1 text-red-600 dark:text-red-400 text-xs font-medium">
                    {Math.round((failureCount / totalChecks) * 100)}% 的检查需要关注
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Manual Trigger Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2.5">
            <List className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            手动触发检查
          </h2>

          {isFetchingScripts ? (
            <div className="flex items-center text-gray-500 dark:text-gray-400 space-x-2">
              <Loader2 className="animate-spin h-5 w-5" />
              <span>加载可用脚本...</span>
            </div>
          ) : availableScripts.length > 0 ? (
            <div className="space-y-5">
              <div>
                <label htmlFor="script-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  选择要执行的脚本:
                </label>
                <select
                  id="script-select"
                  value={selectedScriptId}
                  onChange={(e) => setSelectedScriptId(e.target.value)}
                  disabled={isTriggering || loading}
                  className="block w-full mt-1 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                >
                  {availableScripts.map((script) => (
                    <option key={script.id} value={script.id}>
                      {script.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedScript && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md border border-gray-200 dark:border-gray-600">
                  {selectedScript.description || "此脚本没有描述信息。"}
                </p>
              )}

              <button
                onClick={handleTriggerCheck}
                disabled={!selectedScriptId || isTriggering || loading}
                className={`inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white 
                            ${isTriggering || loading
                              ? 'bg-gray-400 dark:bg-gray-600 cursor-wait'
                              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800'}
                            disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150 ease-in-out transform hover:scale-105`}
              >
                {isTriggering ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    执行中...
                  </>
                ) : (
                  <>
                    <Play className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    执行检查
                  </>
                )}
              </button>

              {triggerMessage && (
                <div className={`mt-4 p-4 rounded-lg text-sm font-medium flex items-start gap-3 shadow-sm border ${
                  triggerMessageType === 'error'
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-600/50'
                    : 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-600/50'
                }`}>
                  {triggerMessageType === 'error' ? <AlertCircle className="h-5 w-5 flex-shrink-0" /> : <CheckCircle className="h-5 w-5 flex-shrink-0" />}
                  <span>{triggerMessage}</span>
                </div>
              )}
            </div>
          ) : (
             <div className="text-center py-6 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                <Database className="h-10 w-10 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">没有可用的检查脚本</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">请确保脚本已正确配置并部署。</p>
             </div>
          )}
        </div>

        {/* History Table Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all hover:shadow-xl">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2.5">
                <Clock className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                历史检查记录
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">显示最近 {totalChecks} 次检查的详细结果</p>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-2 hidden sm:inline">筛选:</span>
              <button
                onClick={() => setFilterStatus(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors duration-150 flex items-center gap-1.5 ${
                  filterStatus === null
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 ring-1 ring-blue-300 dark:ring-blue-700'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Filter size={14} /> 全部 ({totalChecks})
              </button>
              <button
                onClick={() => setFilterStatus(CheckStatus.SUCCESS)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors duration-150 flex items-center gap-1.5 ${
                  filterStatus === CheckStatus.SUCCESS
                    ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 ring-1 ring-green-300 dark:ring-green-700'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <CheckCircle size={14} /> 成功 ({successCount})
              </button>
              <button
                onClick={() => setFilterStatus(CheckStatus.FAILURE)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors duration-150 flex items-center gap-1.5 ${
                  filterStatus === CheckStatus.FAILURE
                    ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 ring-1 ring-red-300 dark:ring-red-700'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <AlertCircle size={14} /> 失败 ({failureCount})
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">脚本名称</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">执行时间</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider max-w-xs truncate">发现/消息</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredChecks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center">
                        <Database className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                        <p className="font-medium">暂无匹配的检查记录</p>
                        {filterStatus && (
                          <button
                            onClick={() => setFilterStatus(null)}
                            className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            清除筛选条件
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {filteredChecks.map((check) => (
                  <React.Fragment key={check._id}>
                    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 ${
                      expandedCheckId === check._id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {check.status === CheckStatus.SUCCESS ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/50 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700">
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            成功
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/50 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700">
                            <AlertCircle className="h-3.5 w-3.5 mr-1" />
                            失败
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {check.script_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(check.execution_time)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={check.findings || check.message || "无"}>
                        {check.findings || check.message || <span className="italic text-gray-400 dark:text-gray-500">无</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <button
                          onClick={() => toggleExpand(check._id)}
                          className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
                            expandedCheckId === check._id
                              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-700'
                              : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                          }`}
                          title={expandedCheckId === check._id ? "收起详情" : "展开详情"}
                        >
                          {expandedCheckId === check._id ? (
                            <>收起<ChevronUp size={14} className="ml-1" /></>
                          ) : (
                            <>详情<ChevronDown size={14} className="ml-1" /></>
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedCheckId === check._id && (
                      <tr className="bg-gray-50 dark:bg-gray-800/70 border-l-4 border-blue-500 dark:border-blue-400">
                        <td colSpan={5} className="px-5 py-5">
                          <div className="bg-white dark:bg-gray-700 rounded-lg p-5 shadow-inner border border-gray-200 dark:border-gray-600 space-y-5">
                            <div>
                              <h4 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">执行消息:</h4>
                              <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-600">
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{check.message || <span className="italic text-gray-500">无消息</span>}</p>
                              </div>
                            </div>
                             {check.findings && (
                                <div>
                                <h4 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">发现:</h4>
                                <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded p-3 border border-yellow-200 dark:border-yellow-700">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap break-words">{check.findings}</p>
                                </div>
                                </div>
                            )}
                            <div>
                              <h4 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">原始查询结果:</h4>
                              <RawResultsTable results={check.raw_results} />
                            </div>
                            {check.github_run_id && (
                              <div className="mt-4 text-right">
                                <a
                                  // Assuming a standard GitHub URL structure, replace if needed
                                  href={`https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO || 'your-org/your-repo'}/actions/runs/${check.github_run_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                                >
                                  查看 GitHub Action 运行
                                  <ExternalLink size={14} className="ml-1.5" />
                                </a>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="text-center text-sm text-gray-500 dark:text-gray-400 py-6 border-t border-gray-200 dark:border-gray-700">
          <p>SQL Check System &copy; {new Date().getFullYear()}</p>
          <p className="mt-1">
            自动化检查由 GitHub Actions 驱动，数据存储于 MongoDB。
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;