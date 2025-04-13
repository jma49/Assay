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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextScheduled, setNextScheduled] = useState<Date | null>(null);
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/check-history');
        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        const data: Check[] = await response.json();
        setChecks(data);
      } catch (err) {
        console.error("Failed to fetch check history:", err);
        setError(err instanceof Error ? err.message : '获取检查历史失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Calculate next scheduled run (assuming cron is '0 19 * * *')
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

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        <span className="ml-2">加载历史记录中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        <AlertCircle className="h-8 w-8 mr-2" />
        <span>加载失败: {error}</span>
      </div>
    );
  }
  
  // Calculate stats based on fetched checks (handle empty checks)
  const successCount = checks.filter(c => c.status === CheckStatus.SUCCESS).length;
  const failureCount = checks.filter(c => c.status === CheckStatus.FAILURE).length;
  const successRate = checks.length > 0 ? Math.round((successCount / checks.length) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4"> {/* Wider max-width */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">SQL Check Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Internal monitoring for automatic SQL checks
        </p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-blue-500" />
            <h2 className="text-sm font-medium">下次检查时间</h2>
          </div>
          <p className="mt-2 text-2xl font-semibold">
            {nextScheduled ? formatDate(nextScheduled.toISOString()) : '计算中...'}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <BarChart2 className="mr-2 h-5 w-5 text-emerald-500" />
            <h2 className="text-sm font-medium">成功率 (最近 {checks.length} 次)</h2>
          </div>
          <p className="mt-2 text-2xl font-semibold">
            {successRate}%
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-amber-500" />
            <h2 className="text-sm font-medium">失败次数 (最近 {checks.length} 次)</h2>
          </div>
          <p className="mt-2 text-2xl font-semibold">
            {failureCount}
          </p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium">最近 {checks.length} 次检查结果</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">脚本</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">执行时间</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">发现</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">详情</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {checks.length === 0 && (
                  <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          暂无检查历史记录
                      </td>
                  </tr>
              )}
              {checks.map((check) => (
                <React.Fragment key={check._id}> {/* Use Fragment for key */}
                  <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${expandedCheckId === check._id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}> {/* Highlight expanded row */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {check.status === CheckStatus.SUCCESS ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {check.script_name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(check.execution_time)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {check.findings}
                    </td>
                     <td className="px-4 py-4 whitespace-nowrap text-sm">
                       <button
                         onClick={() => toggleExpand(check._id)}
                         className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                         title={expandedCheckId === check._id ? "收起详情" : "展开详情"}
                       >
                         <Database size={16} className="mr-1" />
                         {expandedCheckId === check._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                       </button>
                     </td>
                  </tr>
                  {/* Expanded Row for Details */}
                  {expandedCheckId === check._id && (
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="text-sm">
                            <p className="font-medium mb-1">消息:</p>
                            <p className="text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">{check.message}</p>
                            <p className="font-medium mb-1">原始查询结果:</p>
                            <RawResultsTable results={check.raw_results} />
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
      
      <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        SQL Check System • Database Monitoring Tool • {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default Dashboard;