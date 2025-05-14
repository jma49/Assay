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
        .then((data) => {
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
  const getScriptType = (scriptId: string): { type: string, color: string } => {
    if (scriptId.startsWith('check-')) return { type: t.scriptTypes.check, color: 'text-orange-600' };
    if (scriptId.startsWith('validate-')) return { type: t.scriptTypes.validate, color: 'text-purple-600' };
    if (scriptId.startsWith('monitor-')) return { type: t.scriptTypes.monitor, color: 'text-blue-600' };
    if (scriptId.startsWith('report-')) return { type: t.scriptTypes.report, color: 'text-green-600' };
    return { type: t.scriptTypes.other, color: 'text-gray-600' };
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
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-4 text-lg">{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8 bg-red-50 rounded-lg text-center">
        <h2 className="text-2xl font-bold text-red-700 mb-4">{t.loadingFailed}</h2>
        <p className="text-lg text-red-600 mb-6">{error}</p>
        <div className="flex justify-center gap-4">
          <button 
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            {t.retry}
          </button>
          <Button onClick={handleGoToDashboard}>
            <Home className="h-4 w-4" /> 
            {t.back}
          </Button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="container mx-auto p-8 bg-yellow-50 rounded-lg text-center">
        <h2 className="text-2xl font-bold text-yellow-700">{t.notFound}</h2>
        <p className="mt-4">{t.noResultFound} {resultId} 的执行结果。</p>
        <Button onClick={handleGoToDashboard} className="mt-6">
          <Home className="h-4 w-4" /> 
          {t.back}
        </Button>
      </div>
    );
  }

  const scriptType = getScriptType(result.scriptId);

  // 格式化 findings
  let findingsContent;
  if (Array.isArray(result.findings) && result.findings.length > 0) {
    // 设置表格标题和数据
    const headers = Object.keys(result.findings[0]);
    findingsContent = (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {header.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {result.findings.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {headers.map((header) => {
                  const value = row[header as keyof typeof row];
                  return (
                    <td key={`${rowIndex}-${header}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {value === null ? 
                        <span className="text-gray-400">NULL</span> :
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
      <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
        <p className="text-gray-700 whitespace-pre-wrap">{result.findings}</p>
      </div>
    );
  } else {
    findingsContent = (
      <div className="p-6 text-center border border-gray-200 rounded-md bg-gray-50">
        <p className="text-gray-500">{t.noData}</p>
        <p className="text-sm text-gray-400 mt-2">{t.noDataDesc}</p>
      </div>
    );
  }

  // 状态显示逻辑
  const statusColor = result.status === 'success' && result.statusType === 'attention_needed' 
    ? 'text-yellow-600' 
    : result.status === 'success' 
      ? 'text-green-600' 
      : 'text-red-600';

  const statusText = result.statusType === 'attention_needed' 
    ? t.statusTexts.attentionNeeded
    : result.status === 'success' 
      ? t.statusTexts.success
      : t.statusTexts.failure;

  return (
    <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="bg-card/90 dark:bg-card/90 backdrop-blur-sm shadow-lg rounded-lg p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{t.executionDetails}</h1>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${scriptType.color} bg-opacity-10`}>
            {scriptType.type}脚本
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-sm font-medium text-gray-500">{t.scriptId}</p>
            <p className="text-lg text-gray-900">{result.scriptId}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{t.executionTime}</p>
            <p className="text-lg text-gray-900">{formatDate(result.executedAt)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{t.status}</p>
            <p className={`text-lg font-semibold ${statusColor}`}>{statusText}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{t.message}</p>
            <p className="text-lg text-gray-900">{result.message}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{t.resultId}</p>
            <p className="text-lg text-gray-900 font-mono text-sm">{result._id}</p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-700 mb-4">{t.queryFindings}</h2>
          <div className="overflow-x-auto border border-gray-200 rounded-md">
            {findingsContent}
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <Button onClick={handleGoToDashboard}>
            <Home className="h-4 w-4" /> 
            {t.back}
          </Button>
        </div>
      </div>
    </div>
  );
} 