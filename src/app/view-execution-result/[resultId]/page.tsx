'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/components/ClientLayoutWrapper';
import { Button } from '@/components/ui/button';
import { Home, Clock, AlertCircle, CheckCircle, Database, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    loading: 'Loading...',
    loadingFailed: 'Loading Failed',
    retry: 'Retry',
    back: 'Back to Dashboard',
    notFound: 'Result Not Found',
    noResultFound: 'Could not find execution result with ID',
    executionDetails: 'Execution Result Details',
    scriptId: 'Script ID',
    name: 'Name',
    cnName: 'Name (CN)',
    description: 'Description',
    cnDescription: 'Description (CN)',
    scope: 'Scope',
    cnScope: 'Scope (CN)',
    author: 'Author',
    scriptMetadata: 'Script Metadata',
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
    name: '名称',
    cnName: '中文名称',
    description: '描述',
    cnDescription: '中文描述',
    scope: '范围',
    cnScope: '中文范围',
    author: '作者',
    scriptMetadata: '脚本元数据',
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

  // 格式化 findings
  let findingsContent;
  if (Array.isArray(result.findings) && result.findings.length > 0) {
    // 设置表格标题和数据
    const headers = Object.keys(result.findings[0]);
    findingsContent = (
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gradient-to-r from-muted/40 to-muted/20 border-b-2 border-border/30">
              {headers.map((header) => (
                <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">
                  {header.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {result.findings.map((row, rowIndex) => (
              <tr key={rowIndex} className={cn(
                "transition-colors hover:bg-muted/20",
                rowIndex % 2 === 0 ? 'bg-card' : 'bg-muted/10'
              )}>
                {headers.map((header) => {
                  const value = row[header as keyof typeof row];
                  return (
                    <td key={`${rowIndex}-${header}`} className="px-4 py-3 text-sm text-foreground whitespace-nowrap" title={String(value)}>
                      {value === null ?
                        <span className="text-muted-foreground italic">NULL</span> :
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
      <div className="p-6 bg-muted/10 rounded-lg border border-border/20">
        <p className="text-foreground whitespace-pre-wrap leading-relaxed">{result.findings}</p>
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
  const statusText = result.statusType === 'attention_needed'
    ? t.statusTexts.attentionNeeded
    : result.status === 'success'
      ? t.statusTexts.success
      : t.statusTexts.failure;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-8 animate-fadeIn">
          {/* Header Section */}
          <header className="text-center lg:text-left">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-2">
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  {t.executionDetails}
                </h1>
                <p className="text-lg text-muted-foreground">{result.scriptId}</p>
              </div>
              <Button 
                onClick={handleGoToDashboard} 
                variant="outline"
                size="lg"
                className="group shadow-md hover:shadow-lg transition-all duration-300"
              >
                <Home className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                {t.back}
              </Button>
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
                    <h3 className="font-semibold text-foreground">{t.executionTime}</h3>
                    <p className="text-sm text-muted-foreground">{formatDate(result.executedAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40 rounded-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="relative p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-xl ${
                    result.statusType === 'attention_needed' 
                      ? 'bg-amber-100 dark:bg-amber-950/20 ring-2 ring-amber-200 dark:ring-amber-800/50'
                      : result.status === 'success'
                        ? 'bg-green-100 dark:bg-green-950/20 ring-2 ring-green-200 dark:ring-green-800/50'
                        : 'bg-red-100 dark:bg-red-950/20 ring-2 ring-red-200 dark:ring-red-800/50'
                  }`}>
                    {result.statusType === 'attention_needed' ? (
                      <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    ) : result.status === 'success' ? (
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{t.status}</h3>
                    <p className={`text-sm font-medium ${
                      result.statusType === 'attention_needed' 
                        ? 'text-amber-600 dark:text-amber-400'
                        : result.status === 'success'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                    }`}>
                      {statusText}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40 rounded-xl lg:col-span-2 xl:col-span-1">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="relative p-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">{t.message}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed break-words">{result.message}</p>
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
                  {t.scriptMetadata || (language === 'en' ? 'Script Metadata' : '脚本元数据')}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 脚本ID - 总是显示 */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t.scriptId}</p>
                  <p className="text-base text-foreground bg-muted/20 rounded-lg p-3 font-mono">
                    {result.scriptId}
                  </p>
                </div>
                
                {/* 结果ID - 总是显示 */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t.resultId}</p>
                  <p className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3 font-mono break-all">{result._id}</p>
                </div>

                {/* 脚本名称 - 如果存在则显示 */}
                {(language === 'en' ? result.name : result.cnName || result.name) && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t.name || (language === 'en' ? 'Name' : '名称')}</p>
                    <p className="text-base text-foreground bg-muted/20 rounded-lg p-3">
                      {language === 'en' ? result.name : result.cnName || result.name}
                    </p>
                  </div>
                )}
                
                {/* 作者 - 如果存在则显示 */}
                {result.author && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t.author || (language === 'en' ? 'Author' : '作者')}</p>
                    <p className="text-base text-foreground bg-muted/20 rounded-lg p-3">{result.author}</p>
                  </div>
                )}
                
                {/* 描述 - 如果存在则显示 */}
                {(language === 'en' ? result.description : result.cnDescription || result.description) && (
                  <div className="md:col-span-2 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t.description || (language === 'en' ? 'Description' : '描述')}</p>
                    <p className="text-base text-foreground bg-muted/20 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                      {language === 'en' ? result.description : result.cnDescription || result.description}
                    </p>
                  </div>
                )}
                
                {/* 范围 - 如果存在则显示 */}
                {(language === 'en' ? result.scope : result.cnScope || result.scope) && (
                  <div className="md:col-span-2 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t.scope || (language === 'en' ? 'Scope' : '范围')}</p>
                    <p className="text-base text-foreground bg-muted/20 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                      {language === 'en' ? result.scope : result.cnScope || result.scope}
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
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">{t.queryFindings}</h2>
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
            v{process.env.NEXT_PUBLIC_APP_VERSION || '0.1.7'}
          </span>
        </div>
      </div>
    </div>
  );
} 