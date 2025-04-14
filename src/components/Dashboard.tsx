"use client"

import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Database,
  Loader2, // For loading state
  Play, // For the run button
  List, // For the script list
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

// Removed Mock Data

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Helper to render raw results as a simple table
const RawResultsTable = ({ results }: { results: Record<string, unknown>[] }) => {
  if (!results || results.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 italic">无原始数据</p>;
  }

  const headers = Object.keys(results[0]);

  return (
    <div className="overflow-x-auto mt-2 border border-gray-200 dark:border-gray-700 rounded">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-100 dark:bg-gray-900">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-2 py-1 text-left font-medium text-gray-600 dark:text-gray-300">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {results.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              {headers.map((header) => (
                <td key={header} className="px-2 py-1 whitespace-nowrap">
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
  const [loading, setLoading] = useState(true); // Combined loading state initially
  const [error, setError] = useState<string | null>(null);
  const [nextScheduled, setNextScheduled] = useState<Date | null>(null);
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // State for script execution
  const [availableScripts, setAvailableScripts] = useState<ScriptInfo[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [isFetchingScripts, setIsFetchingScripts] = useState(true); // Separate loading for scripts
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);

  useEffect(() => {
    // Fetch both check history and available scripts
    const loadInitialData = async () => {
      setLoading(true); // Indicate overall loading start
      setIsFetchingScripts(true);
      setError(null);
      setTriggerMessage(null); // Clear previous trigger messages

      try {
        // Fetch history (parallel fetch)
        const historyPromise = fetch('/api/check-history').then(res => {
          if (!res.ok) throw new Error(`API Error (History): ${res.status} ${res.statusText}`);
          return res.json();
        });

        // Fetch scripts (parallel fetch)
        const scriptsPromise = fetch('/api/list-scripts').then(res => {
          if (!res.ok) throw new Error(`API Error (Scripts): ${res.status} ${res.statusText}`);
          return res.json();
        });

        // Wait for both fetches to complete
        const [historyData, scriptsData]: [Check[], ScriptInfo[]] = await Promise.all([historyPromise, scriptsPromise]);

        setChecks(historyData);
        setAvailableScripts(scriptsData);

        // Set default selected script if available
        if (scriptsData.length > 0) {
          setSelectedScriptId(scriptsData[0].id);
        }

      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        setError(err instanceof Error ? err.message : '获取初始化数据失败');
      } finally {
        setLoading(false); // Overall loading finished
        setIsFetchingScripts(false); // Script fetching finished
      }
    };

    loadInitialData();

    // Calculate next scheduled run (remains the same)
    const now = new Date();
    const nextRun = new Date();
    nextRun.setUTCHours(19, 0, 0, 0);
    if (nextRun < now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    setNextScheduled(nextRun);

  }, []); // Empty dependency array means run once on mount

  const toggleExpand = (checkId: string) => {
    setExpandedCheckId(expandedCheckId === checkId ? null : checkId);
  };

  // --- Trigger Check Function ---
  const handleTriggerCheck = async () => {
    if (!selectedScriptId || isTriggering) {
      return; // Prevent triggering if no script is selected or already triggering
    }

    setIsTriggering(true);
    setTriggerMessage(null); // Clear previous message
    // console.log(`准备触发脚本: ${selectedScriptId}`); // Keep for debugging if needed

    try {
      // Real API call to trigger the check
      const response = await fetch('/api/run-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: selectedScriptId })
      });

      // Check if the API request itself was successful
      if (!response.ok) {
        let errorMessage = `API 错误: ${response.status} ${response.statusText}`;
        try {
          // Try to parse a more specific error message from the API response body
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage; // Use API message if available
        } catch {
          // Ignore if response body isn't valid JSON
        }
        throw new Error(errorMessage);
      }

      // API request succeeded, get the confirmation message
      const result = await response.json(); 
      console.log('Trigger API response:', result); 

      // Update UI with the success message from the API response
      setTriggerMessage(`✅ ${result.message || '检查已成功触发。'}`); // Use message from API

      // Optionally, set a timeout to clear the message
      setTimeout(() => setTriggerMessage(null), 8000); // Clear after 8 seconds

      // Optionally, refresh history after a delay (consider if needed)
      // setTimeout(() => { loadInitialData(); /* Or just fetchData() if scripts don't change */ }, 5000); 

    } catch (err) {
      console.error("Failed to trigger check:", err);
      const errorMessage = err instanceof Error ? err.message : '触发检查失败';
      setTriggerMessage(`❌ ${errorMessage}`);
      // Keep error message displayed longer or until next attempt
      setTimeout(() => setTriggerMessage(null), 10000); 
    } finally {
      setIsTriggering(false);
    }
  };

  // Filter checks based on status
  const filteredChecks = filterStatus
    ? checks.filter(check => check.status === filterStatus)
    : checks;

  // Find selected script details for display
  const selectedScript = availableScripts.find(s => s.id === selectedScriptId);

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg flex flex-col items-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-500 mb-4" />
          <span className="text-lg font-medium">加载历史记录中...</span>
          <p className="text-gray-500 dark:text-gray-400 mt-2">请稍候，正在获取最新数据</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-red-200 dark:border-red-900">
          <div className="flex items-center text-red-500 mb-4">
            <AlertCircle className="h-8 w-8 mr-3" />
            <h2 className="text-xl font-semibold">数据加载失败</h2>
          </div>
          <p className="text-gray-700 dark:text-gray-300">错误信息: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }
  
  // Calculate stats based on fetched checks (handle empty checks)
  const successCount = checks.filter(c => c.status === CheckStatus.SUCCESS).length;
  const failureCount = checks.filter(c => c.status === CheckStatus.FAILURE).length;
  const successRate = checks.length > 0 ? Math.round((successCount / checks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
            <Database className="mr-3 h-8 w-8 text-blue-500" />
            SQL Check Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
            实时监控自动化 SQL 检查任务执行情况，帮助 QA 团队监控数据
          </p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-blue-500 transition-all hover:shadow-lg">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3 mr-4">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">下次计划检查</h2>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {nextScheduled ? formatDate(nextScheduled.toISOString()) : '计算中...'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-emerald-500 transition-all hover:shadow-lg">
            <div className="flex items-center">
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-3 mr-4">
                <BarChart2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">成功率</h2>
                <div className="flex items-end">
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{successRate}%</p>
                  <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">共 {checks.length} 次检查</p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full" 
                    style={{ width: `${successRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-amber-500 transition-all hover:shadow-lg">
            <div className="flex items-center">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3 mr-4">
                <AlertCircle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">失败检查</h2>
                <div className="flex items-end">
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{failureCount}</p>
                  <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">/ {checks.length} 次检查</p>
                </div>
                {failureCount > 0 && (
                  <p className="mt-1 text-red-500 text-sm">需要关注 {Math.round((failureCount/checks.length)*100)}% 的检查失败</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8 transition-all hover:shadow-lg">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <List className="h-5 w-5 mr-2 text-indigo-500" />
            手动触发检查
          </h2>
          
          {isFetchingScripts ? (
            <div className="flex items-center text-gray-500 dark:text-gray-400">
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              <span>加载可用脚本...</span>
            </div>
          ) : availableScripts.length > 0 ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="script-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  选择要执行的脚本
                </label>
                <select
                  id="script-select"
                  value={selectedScriptId}
                  onChange={(e) => setSelectedScriptId(e.target.value)}
                  disabled={isTriggering}
                  className="block w-full mt-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {availableScripts.map((script) => (
                    <option key={script.id} value={script.id}>
                      {script.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedScript && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  {selectedScript.description}
                </p>
              )}

              <button
                onClick={handleTriggerCheck}
                disabled={!selectedScriptId || isTriggering}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white 
                            ${isTriggering 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'}
                            disabled:opacity-70 disabled:cursor-not-allowed transition-colors`}
              >
                {isTriggering ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    触发中...
                  </>
                ) : (
                  <>
                    <Play className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    执行检查
                  </>
                )}
              </button>

              {triggerMessage && (
                <div className={`mt-4 p-3 rounded-md text-sm ${triggerMessage.startsWith('❌') ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'}`}>
                  {triggerMessage}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">没有可用的检查脚本。</p>
          )}
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden mb-8 transition-all hover:shadow-lg">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">历史检查记录</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">显示最近 {checks.length} 次检查的详细结果</p>
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => setFilterStatus(null)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filterStatus === null 
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                全部
              </button>
              <button 
                onClick={() => setFilterStatus(CheckStatus.SUCCESS)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filterStatus === CheckStatus.SUCCESS
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  成功
                </span>
              </button>
              <button 
                onClick={() => setFilterStatus(CheckStatus.FAILURE)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filterStatus === CheckStatus.FAILURE
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1.5" />
                  失败
                </span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">状态</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">脚本</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">执行时间</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">发现</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">详情</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredChecks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center">
                        <Database className="h-10 w-10 text-gray-400 dark:text-gray-600 mb-3" />
                        <p>暂无匹配的检查记录</p>
                        {filterStatus && (
                          <button 
                            onClick={() => setFilterStatus(null)}
                            className="mt-3 text-blue-500 hover:text-blue-600 text-sm"
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
                    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      expandedCheckId === check._id 
                        ? 'bg-blue-50 dark:bg-blue-900/20' 
                        : ''
                    } transition-colors`}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {check.status === CheckStatus.SUCCESS ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-1 text-xs font-medium text-green-800 dark:text-green-300">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            成功
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-1 text-xs font-medium text-red-800 dark:text-red-300">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            失败
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {check.script_name}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(check.execution_time)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {check.findings || "无异常发现"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => toggleExpand(check._id)}
                          className={`group px-3 py-1.5 rounded transition-colors ${
                            expandedCheckId === check._id
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title={expandedCheckId === check._id ? "收起详情" : "展开详情"}
                        >
                          <span className="flex items-center">
                            <Database size={16} className="mr-1.5" />
                            {expandedCheckId === check._id ? (
                              <>收起<ChevronUp size={16} className="ml-1" /></>
                            ) : (
                              <>详情<ChevronDown size={16} className="ml-1" /></>
                            )}
                          </span>
                        </button>
                      </td>
                    </tr>
                    {expandedCheckId === check._id && (
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        <td colSpan={5} className="px-6 py-5">
                          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 text-sm shadow-inner">
                            <div className="mb-4">
                              <p className="font-medium mb-2 text-gray-700 dark:text-gray-300">执行消息:</p>
                              <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-600">
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{check.message || "无消息"}</p>
                              </div>
                            </div>
                            <div>
                              <p className="font-medium mb-2 text-gray-700 dark:text-gray-300">原始查询结果:</p>
                              <RawResultsTable results={check.raw_results} />
                            </div>
                            {check.github_run_id && (
                              <div className="mt-4 text-right">
                                <a 
                                  href={`https://github.com/your-org/your-repo/actions/runs/${check.github_run_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-600 flex items-center justify-end text-sm"
                                >
                                  查看 GitHub Action 运行详情
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
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
        
        <footer className="text-center text-sm text-gray-500 dark:text-gray-400 py-4 border-t border-gray-200 dark:border-gray-800">
          <p>SQL Check System • 数据库监控工具 • {new Date().getFullYear()}</p>
          <p className="mt-1">
            自动化检查每日执行，通过 GitHub Actions 与 MongoDB 追踪历史数据
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;