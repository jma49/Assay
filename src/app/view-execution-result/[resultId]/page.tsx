'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/components/ClientLayoutWrapper';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

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
type FindingDetail = OrderDuplicateDetail | OrderSyncDetail | Record<string, string | number | boolean | null>;

interface ExecutionResult {
  scriptId: string;
  executedAt: string;
  status: string;
  statusType?: string; // 可能存在的更详细状态
  message: string;
  findings: FindingDetail[] | string; // findings 可以是对象数组或字符串
  _id: string;
}

// 语言翻译对象
const viewResultTranslations = {
  en: {
    loading: 'Loading...',
    loadingFailed: 'Loading Failed',
    retry: 'Retry',
    back: 'Back to Dashboard',
    notFound: 'Result Not Found',
    noResultFound: 'Could not find execution result with ID',
    executionDetails: 'Execution Result Details',
    scriptId: 'Script ID',
    executionTime: 'Execution Time',
    status: 'Status',
    message: 'Message',
    resultId: 'Result ID',
    queryFindings: 'Query Findings',
    createdAt: 'Created At', 
    noData: 'No Data Found',
    noDataDesc: 'This script execution did not return any data',
    scriptTypes: {
      check: 'Check',
      validate: 'Validate',
      monitor: 'Monitor',
      report: 'Report',
      other: 'Other'
    },
    statusTexts: {
      success: 'Success',
      attentionNeeded: 'Attention Needed',
      failure: 'Failed'
    }
  },
  zh: {
    loading: '加载中...',
    loadingFailed: '加载失败',
    retry: '重试',
    back: '返回仪表盘',
    notFound: '未找到结果',
    noResultFound: '无法找到ID为',
    executionDetails: '执行结果详情',
    scriptId: '脚本 ID',
    executionTime: '执行时间',
    status: '状态',
    message: '消息',
    resultId: '结果 ID',
    queryFindings: '查询发现',
    createdAt: '创建时间',
    noData: '无数据发现',
    noDataDesc: '此脚本执行未返回任何数据结果',
    scriptTypes: {
      check: '检查',
      validate: '验证',
      monitor: '监控',
      report: '报告',
      other: '其他'
    },
    statusTexts: {
      success: '成功',
      attentionNeeded: '需要关注',
      failure: '失败'
    }
  }
};

export default function ViewExecutionResultPage() {
  const router = useRouter();
  const params = useParams() || {};
  const resultId = params.resultId as string | undefined;
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  
  // 使用全局语言系统
  const { language } = useLanguage();
  const t = viewResultTranslations[language];

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
            data.scriptId === 'orders-sync-daily' &&
            data.status === 'success' &&
            Array.isArray(data.findings) &&
            data.findings.length > 0
          ) {
            data.statusType = 'attention_needed';
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
      return new Date(dateString).toLocaleString(language === 'en' ? 'en-US' : 'zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: language === 'en'
      });
    } catch {
      return dateString || (language === 'en' ? 'Unknown time' : '未知时间');
    }
  };

  // 获取脚本类型 (check, validate 等)
  const getScriptType = (scriptId: string): { type: string, textColor: string, bgColor: string } => {
    // Colors based on Catppuccin Mocha theme from globals.css
    // Light mode colors are placeholders and should be reviewed if light theme is also Catppuccin
    if (scriptId.startsWith('check-')) return { type: t.scriptTypes.check, textColor: 'text-orange-600 dark:text-[#fab387]', bgColor: 'bg-orange-100 dark:bg-[#fab387]/20' }; // Peach
    if (scriptId.startsWith('validate-')) return { type: t.scriptTypes.validate, textColor: 'text-purple-600 dark:text-[#cba6f7]', bgColor: 'bg-purple-100 dark:bg-[#cba6f7]/20' }; // Mauve
    if (scriptId.startsWith('monitor-')) return { type: t.scriptTypes.monitor, textColor: 'text-blue-600 dark:text-[#89b4fa]', bgColor: 'bg-blue-100 dark:bg-[#89b4fa]/20' }; // Blue
    if (scriptId.startsWith('report-')) return { type: t.scriptTypes.report, textColor: 'text-green-600 dark:text-[#a6e3a1]', bgColor: 'bg-green-100 dark:bg-[#a6e3a1]/20' }; // Green
    return { type: t.scriptTypes.other, textColor: 'text-gray-600 dark:text-[#a5adce]', bgColor: 'bg-gray-100 dark:bg-[#363a4f]' }; // Subtext0 on Surface0
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  const handleGoToDashboard = () => {
    // 直接导航到仪表盘
    router.push('/');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 dark:border-[#89b4fa] border-r-transparent"></div>
        <p className="mt-4 text-lg text-gray-700 dark:text-[#a5adce]">{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8 bg-red-50 dark:bg-[#f38ba8]/30 rounded-lg text-center">
        <h2 className="text-2xl font-bold text-red-700 dark:text-[#f38ba8] mb-4">{t.loadingFailed}</h2>
        <p className="text-lg text-red-600 dark:text-[#f38ba8] mb-6">{error}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-[var(--primary)] dark:text-[var(--primary-foreground)] dark:hover:brightness-90 transition"
          >
            {t.retry}
          </button>
          <Button onClick={handleGoToDashboard} variant="outline" className="dark:text-[var(--primary)] dark:border-[var(--primary)] dark:hover:bg-[var(--primary)]/10">
            <Home className="h-4 w-4 mr-2" />
            {t.back}
          </Button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="container mx-auto p-8 bg-yellow-50 dark:bg-[#f9e2af]/30 rounded-lg text-center">
        <h2 className="text-2xl font-bold text-yellow-700 dark:text-[#f9e2af]">{t.notFound}</h2>
        <p className="mt-4 text-gray-700 dark:text-[#a5adce]">{t.noResultFound} {resultId} 的执行结果。</p>
        <Button onClick={handleGoToDashboard} className="mt-6 dark:text-[var(--primary)] dark:border-[var(--primary)] dark:hover:bg-[var(--primary)]/10" variant="outline">
          <Home className="h-4 w-4 mr-2" />
          {t.back}
        </Button>
      </div>
    );
  }

  const scriptTypeInfo = getScriptType(result.scriptId);

  // 格式化 findings
  let findingsContent;
  if (Array.isArray(result.findings) && result.findings.length > 0) {
    // 设置表格标题和数据
    const headers = Object.keys(result.findings[0]);
    findingsContent = (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-[#494d64]">
          <thead className="bg-gray-50 dark:bg-[#363a4f]">
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-[#a5adce] uppercase tracking-wider">
                  {header.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#1e2030] divide-y divide-gray-200 dark:divide-[#494d64]">
            {result.findings.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white dark:bg-[#1e2030]' : 'bg-gray-50 dark:bg-[#24273a]'}>
                {headers.map((header) => {
                  const value = row[header as keyof typeof row];
                  return (
                    <td key={`${rowIndex}-${header}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-[#cad3f5]">
                      {value === null ?
                        <span className="text-gray-400 dark:text-[#a5adce]">NULL</span> :
                        typeof value === 'object' ?
                          JSON.stringify(value) :
                          String(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else if (typeof result.findings === 'string') {
    findingsContent = (
      <div className="p-4 border border-gray-200 dark:border-[#494d64] rounded-md bg-gray-50 dark:bg-[#363a4f]">
        <p className="text-gray-700 dark:text-[#cad3f5] whitespace-pre-wrap">{result.findings}</p>
      </div>
    );
  } else {
    findingsContent = (
      <div className="p-6 text-center border border-gray-200 dark:border-[#494d64] rounded-md bg-gray-50 dark:bg-[#363a4f]">
        <p className="text-gray-500 dark:text-[#a5adce]">{t.noData}</p>
        <p className="text-sm text-gray-400 dark:text-[#a5adce] mt-2">{t.noDataDesc}</p>
      </div>
    );
  }

  // 状态显示逻辑
  // Catppuccin Mocha theme colors: Yellow (#f9e2af), Green (#a6e3a1), Red (#f38ba8)
  const statusColor = result.status === 'success' && result.statusType === 'attention_needed'
    ? 'text-yellow-600 dark:text-[#f9e2af]'
    : result.status === 'success'
      ? 'text-green-600 dark:text-[#a6e3a1]'
      : 'text-red-600 dark:text-[#f38ba8]';

  const statusText = result.statusType === 'attention_needed'
    ? t.statusTexts.attentionNeeded
    : result.status === 'success'
      ? t.statusTexts.success
      : t.statusTexts.failure;

  return (
    <div className="container mx-auto p-4 md:p-8 bg-gray-50 dark:bg-[#24273a] min-h-screen">
      <div className="bg-white dark:bg-[#1e2030]/90 backdrop-blur-sm shadow-lg rounded-lg p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-[#cad3f5]">{t.executionDetails}</h1>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${scriptTypeInfo.textColor} ${scriptTypeInfo.bgColor}`}>
            {scriptTypeInfo.type}脚本
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-[#a5adce]">{t.scriptId}</p>
            <p className="text-lg text-gray-900 dark:text-[#cad3f5]">{result.scriptId}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-[#a5adce]">{t.executionTime}</p>
            <p className="text-lg text-gray-900 dark:text-[#cad3f5]">{formatDate(result.executedAt)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-[#a5adce]">{t.status}</p>
            <p className={`text-lg font-semibold ${statusColor}`}>{statusText}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-[#a5adce]">{t.message}</p>
            <p className="text-lg text-gray-900 dark:text-[#cad3f5]">{result.message}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-[#a5adce]">{t.resultId}</p>
            <p className="text-lg text-gray-900 dark:text-[#cad3f5] font-mono text-sm">{result._id}</p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-700 dark:text-[#cad3f5] mb-4">{t.queryFindings}</h2>
          <div className="overflow-x-auto border border-gray-200 dark:border-[#494d64] rounded-md">
            {findingsContent}
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <Button 
            onClick={handleGoToDashboard} 
            variant="default"
            className="dark:bg-[var(--primary)] dark:text-[var(--primary-foreground)] dark:hover:brightness-90"
          >
            <Home className="h-4 w-4" />
            {t.back}
          </Button>
        </div>
      </div>
    </div>
  );
} 