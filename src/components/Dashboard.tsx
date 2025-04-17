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
} from 'lucide-react';
import { toast } from "sonner";
import { useTheme } from "next-themes";

// 导入shadcn UI组件
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

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
    return <p className="text-sm text-muted-foreground italic mt-2">无原始数据</p>;
  }

  const headers = Object.keys(results[0]);

  return (
    <div className="overflow-x-auto mt-2 border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((row, index) => (
            <TableRow key={index}>
              {headers.map((header) => (
                <TableCell key={header}>
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

// 添加骨架屏组件
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
      {Array(4).fill(0).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </CardContent>
  </Card>
);

const Dashboard = () => {
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
  const [triggerMessageType, setTriggerMessageType] = useState<'success' | 'error' | null>(null); // For styling message

  const { theme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setIsFetchingScripts(true);
    setError(null);
    setTriggerMessage(null);
    setTriggerMessageType(null);
    setIsRefreshing(true);

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
      setIsRefreshing(false);
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

    // 添加淡入动画样式作为内联样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .animate-fadeIn {
        animation: fadeIn 0.5s ease-in-out;
      }
    `;
    document.head.appendChild(style);

    // 组件卸载时清理
    return () => {
      document.head.removeChild(style);
    };
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
      const successMessage = result.message || '检查已成功触发。';
      setTriggerMessage(successMessage);
      setTriggerMessageType('success');
      
      // 使用Sonner通知
      toast.success('检查已触发', {
        description: successMessage,
        duration: 5000,
      });

      // Refresh history after a short delay to allow processing
      setTimeout(loadInitialData, 3000); // Refresh after 3 seconds

    } catch (err) {
      console.error("Failed to trigger check:", err);
      const errorMessage = err instanceof Error ? err.message : '触发检查失败';
      setTriggerMessage(errorMessage);
      setTriggerMessageType('error');
      
      // 使用Sonner通知
      toast.error('触发检查失败', {
        description: errorMessage,
        duration: 8000,
      });
    } finally {
      setIsTriggering(false);
      // Clear message after a longer delay
      setTimeout(() => {
        setTriggerMessage(null);
        setTriggerMessageType(null);
      }, 8000);
    }
  };

  // 按条件过滤和排序数据
  const filteredAndSortedChecks = React.useMemo(() => {
    // 首先按状态过滤
    let filtered = filterStatus
      ? checks.filter(check => check.status === filterStatus)
      : checks;
    
    // 然后按搜索词过滤
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(check => 
        check.script_name.toLowerCase().includes(term) || 
        (check.message && check.message.toLowerCase().includes(term)) ||
        (check.findings && check.findings.toLowerCase().includes(term))
      );
    }
    
    // 最后排序
    if (sortConfig.key !== '') {
      filtered = [...filtered].sort((a, b) => {
        const key = sortConfig.key as keyof Check;
        
        // 适配不同类型的值
        if (key === 'execution_time') {
          // 日期类型特殊处理
          return sortConfig.direction === 'ascending' 
            ? new Date(a[key] as string).getTime() - new Date(b[key] as string).getTime()
            : new Date(b[key] as string).getTime() - new Date(a[key] as string).getTime();
        } else {
          // 字符串类型比较
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
  
  // 排序处理函数
  const requestSort = (key: keyof Check) => {
    // 如果点击的是当前排序的列，切换排序方向
    if (sortConfig.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === 'ascending' ? 'descending' : 'ascending'
      });
    } else {
      // 否则按新列降序排序
      setSortConfig({ key, direction: 'descending' });
    }
  };

  const selectedScript = availableScripts.find(s => s.id === selectedScriptId);

  // --- Render Logic ---

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
          
          {/* 骨架屏-统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          
          {/* 骨架屏-触发部分 */}
          <SkeletonTable />
          
          {/* 骨架屏-历史记录表 */}
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
            <CardTitle className="text-center text-destructive">数据加载失败</CardTitle>
            <CardDescription className="text-center">
              无法连接到服务器或处理请求时出错。请检查您的网络连接或稍后重试。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>错误信息</AlertTitle>
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
              重试加载
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const successCount = checks.filter(c => c.status === CheckStatus.SUCCESS).length;
  const failureCount = checks.filter(c => c.status === CheckStatus.FAILURE).length;
  const totalChecks = checks.length;
  const successRate = totalChecks > 0 ? Math.round((successCount / totalChecks) * 100) : 0;

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="pb-6 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Database className="h-8 w-8 text-primary flex-shrink-0" />
                SQL Check Dashboard
              </h1>
              <p className="mt-2 text-base text-muted-foreground max-w-3xl">
                实时监控自动化 SQL 检查任务执行情况，追踪数据质量和一致性。
              </p>
            </div>
            <Button
              onClick={loadInitialData}
              disabled={loading || isRefreshing}
              variant="outline"
              size="sm"
              className="relative"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? '刷新中...' : '刷新'}
              {isRefreshing && (
                <span className="absolute inset-0 rounded-md bg-primary/10 animate-pulse"></span>
              )}
            </Button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Next Scheduled Card */}
          <Card className="transition-all duration-300 hover:shadow-md border-l-4 border-l-blue-500 dark:border-l-blue-400">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">下次计划检查</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {nextScheduled ? formatDate(nextScheduled.toISOString()) : '计算中...'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Success Rate Card */}
          <Card className="transition-all duration-300 hover:shadow-md border-l-4 border-l-emerald-500 dark:border-l-emerald-400">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">成功率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="bg-emerald-500/10 p-3 rounded-full">
                  <BarChart2 className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-baseline space-x-2">
                    <p className="text-2xl font-semibold">{successRate}%</p>
                    <p className="text-sm text-muted-foreground">({successCount}/{totalChecks})</p>
                  </div>
                  <Progress className="h-1.5" value={successRate} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Failure Count Card */}
          <Card className="transition-all duration-300 hover:shadow-md border-l-4 border-l-amber-500 dark:border-l-amber-400">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">失败检查</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="bg-amber-500/10 p-3 rounded-full">
                  <AlertCircle className="h-6 w-6 text-amber-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline space-x-2">
                    <p className="text-2xl font-semibold">{failureCount}</p>
                    <p className="text-sm text-muted-foreground">/ {totalChecks} 次检查</p>
                  </div>
                  {failureCount > 0 && totalChecks > 0 && (
                    <p className="text-red-500 text-xs font-medium">
                      {Math.round((failureCount / totalChecks) * 100)}% 的检查需要关注
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Manual Trigger Section */}
        <Card className="overflow-hidden border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5">
              <List className="h-5 w-5 text-primary" />
              手动触发检查
            </CardTitle>
            <CardDescription>
              选择并运行SQL检查脚本
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isFetchingScripts ? (
              <div className="flex items-center text-muted-foreground space-x-2">
                <Loader2 className="animate-spin h-5 w-5" />
                <span>加载可用脚本...</span>
              </div>
            ) : availableScripts.length > 0 ? (
              <div className="space-y-5">
                <div className="grid gap-2">
                  <label htmlFor="script-select" className="text-sm font-medium">
                    选择要执行的脚本:
                  </label>
                  <select
                    id="script-select"
                    value={selectedScriptId}
                    onChange={(e) => setSelectedScriptId(e.target.value)}
                    disabled={isTriggering || loading}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {availableScripts.map((script) => (
                      <option key={script.id} value={script.id}>
                        {script.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedScript && (
                  <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground italic">
                    {selectedScript.description || "此脚本没有描述信息。"}
                  </div>
                )}

                <Button
                  onClick={handleTriggerCheck}
                  disabled={!selectedScriptId || isTriggering || loading}
                  className="w-full"
                >
                  {isTriggering ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      执行中...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      执行检查
                    </>
                  )}
                </Button>

                {triggerMessage && (
                  <Alert variant={triggerMessageType === 'error' ? "destructive" : "default"}>
                    <AlertTitle>
                      {triggerMessageType === 'error' ? "执行失败" : "执行成功"}
                    </AlertTitle>
                    <AlertDescription>
                      {triggerMessage}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
               <div className="text-center py-6 px-4 bg-muted/50 rounded-lg border border-dashed">
                  <Database className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">没有可用的检查脚本</p>
                  <p className="text-sm text-muted-foreground mt-1">请确保脚本已正确配置并部署。</p>
               </div>
            )}
          </CardContent>
        </Card>

        {/* History Table Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2.5">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  历史检查记录
                </CardTitle>
                <CardDescription>
                  显示最近 {totalChecks} 次检查的详细结果
                </CardDescription>
              </div>

              <div className="space-y-2 w-full sm:w-auto">
                {/* 搜索框 - 优化搜索图标 */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="搜索脚本名称或消息..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-9 pl-9 pr-4 text-sm rounded-md border border-input ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:ring-offset-2"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  {searchTerm && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="absolute right-1 top-1 h-7 w-7 p-0" 
                      onClick={() => setSearchTerm('')}
                    >
                      <span className="sr-only">清除</span>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Filter Buttons - 添加动画效果 */}
                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                  <Button
                    variant={filterStatus === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus(null)}
                    className="h-8 gap-1 transition-all duration-200"
                  >
                    <Filter size={14} /> 全部 <Badge variant="secondary" className="ml-1">{totalChecks}</Badge>
                  </Button>
                  <Button
                    variant={filterStatus === CheckStatus.SUCCESS ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus(CheckStatus.SUCCESS)}
                    className="h-8 gap-1 transition-all duration-200"
                  >
                    <CheckCircle size={14} /> 成功 <Badge variant="secondary" className="ml-1">{successCount}</Badge>
                  </Button>
                  <Button
                    variant={filterStatus === CheckStatus.FAILURE ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus(CheckStatus.FAILURE)}
                    className="h-8 gap-1 transition-all duration-200"
                  >
                    <AlertCircle size={14} /> 失败 <Badge variant="secondary" className="ml-1">{failureCount}</Badge>
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">状态</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => requestSort('script_name')}
                    >
                      脚本名称
                      {sortConfig.key === 'script_name' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead 
                      className="hidden md:table-cell cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => requestSort('execution_time')}
                    >
                      执行时间
                      {sortConfig.key === 'execution_time' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                        </span>
                      )}
                    </TableHead>
                    <TableHead className="hidden sm:table-cell max-w-xs">发现/消息</TableHead>
                    <TableHead className="text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedChecks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <div className="flex flex-col items-center">
                          <Database className="h-12 w-12 text-muted-foreground mb-4" />
                          <p className="font-medium">暂无匹配的检查记录</p>
                          {filterStatus && (
                            <Button
                              onClick={() => setFilterStatus(null)}
                              variant="link"
                              className="mt-2"
                            >
                              清除筛选条件
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredAndSortedChecks.map((check) => (
                    <React.Fragment key={check._id}>
                      <TableRow className={cn(
                        "transition-colors",
                        expandedCheckId === check._id ? "bg-muted/60" : ""
                      )}>
                        <TableCell>
                          {check.status === CheckStatus.SUCCESS ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              成功
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                              <AlertCircle className="h-3.5 w-3.5 mr-1" />
                              失败
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {check.script_name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {formatDate(check.execution_time)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell max-w-xs truncate" title={check.findings || check.message || "无"}>
                          {check.findings || check.message || <span className="italic text-muted-foreground">无</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant={expandedCheckId === check._id ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleExpand(check._id)}
                              className="h-8 px-2 gap-1"
                            >
                              {expandedCheckId === check._id ? (
                                <>收起<ChevronUp size={14} /></>
                              ) : (
                                <>详情<ChevronDown size={14} /></>
                              )}
                            </Button>
                            
                            <Sheet>
                              <SheetTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                >
                                  <ExternalLink size={14} />
                                </Button>
                              </SheetTrigger>
                              <SheetContent>
                                <SheetHeader>
                                  <SheetTitle>检查详情</SheetTitle>
                                  <SheetDescription>
                                    {check.script_name} - {formatDate(check.execution_time)}
                                  </SheetDescription>
                                </SheetHeader>
                                <div className="space-y-6 py-6">
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2">执行状态:</h4>
                                    {check.status === CheckStatus.SUCCESS ? (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                        成功
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                        失败
                                      </Badge>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2">执行消息:</h4>
                                    <div className="bg-muted p-3 rounded text-sm">
                                      {check.message || <span className="italic text-muted-foreground">无消息</span>}
                                    </div>
                                  </div>
                                  {check.findings && (
                                    <div>
                                      <h4 className="text-sm font-semibold mb-2">发现:</h4>
                                      <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded text-sm text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                        {check.findings}
                                      </div>
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2">原始查询结果:</h4>
                                    <RawResultsTable results={check.raw_results} />
                                  </div>
                                  {check.github_run_id && (
                                    <div className="text-right">
                                      <Button asChild variant="outline" size="sm">
                                        <a
                                          href={`https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO || 'your-org/your-repo'}/actions/runs/${check.github_run_id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          查看 GitHub Action
                                          <ExternalLink size={14} className="ml-1.5" />
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
                          <TableCell colSpan={5} className="p-5">
                            <Card className="shadow-sm border">
                              <CardContent className="space-y-5 pt-6">
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">执行消息:</h4>
                                  <div className="bg-background rounded p-3 border text-sm">
                                    {check.message || <span className="italic text-muted-foreground">无消息</span>}
                                  </div>
                                </div>
                                {check.findings && (
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2">发现:</h4>
                                    <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded text-sm text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                      {check.findings}
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">原始查询结果:</h4>
                                  <RawResultsTable results={check.raw_results} />
                                </div>
                                {check.github_run_id && (
                                  <div className="text-right">
                                    <Button asChild variant="outline" size="sm">
                                      <a
                                        href={`https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO || 'your-org/your-repo'}/actions/runs/${check.github_run_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        查看 GitHub Action
                                        <ExternalLink size={14} className="ml-1.5" />
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
        </Card>

        <footer className="text-center text-sm text-muted-foreground py-6 border-t">
          <p>SQL Check System &copy; {new Date().getFullYear()}</p>
          <p className="mt-1">
            自动化检查由 GitHub Actions 驱动，数据存储于 MongoDB。
            <span className="inline-block ml-2 text-primary">当前主题: {theme || '加载中...'}</span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;