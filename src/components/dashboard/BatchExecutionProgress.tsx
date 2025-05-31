/** @jsxImportSource react */
import React, { useState } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  X, 
  Loader2, 
  AlertTriangle,
  Database,
  TrendingUp
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export interface ScriptExecutionStatus {
  scriptId: string;
  scriptName: string;
  isScheduled: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'attention_needed';
  startTime?: Date;
  endTime?: Date;
  message?: string;
  findings?: string;
  mongoResultId?: string;
}

interface BatchExecutionProgressProps {
  isVisible: boolean;
  scripts: ScriptExecutionStatus[];
  onClose: () => void;
  onCancel?: () => void;
  language: string;
}

export const BatchExecutionProgress: React.FC<BatchExecutionProgressProps> = ({
  isVisible,
  scripts,
  onClose,
  onCancel,
  language
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  // 计算统计信息
  const stats = {
    total: scripts.length,
    pending: scripts.filter(s => s.status === 'pending').length,
    running: scripts.filter(s => s.status === 'running').length,
    completed: scripts.filter(s => s.status === 'completed').length,
    failed: scripts.filter(s => s.status === 'failed').length,
    attention: scripts.filter(s => s.status === 'attention_needed').length,
  };

  const progress = ((stats.completed + stats.failed + stats.attention) / stats.total) * 100;
  const isExecuting = stats.running > 0 || stats.pending > 0;
  const isCompleted = stats.pending === 0 && stats.running === 0;

  // 获取状态图标和颜色
  const getStatusIcon = (status: ScriptExecutionStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <X className="h-4 w-4 text-red-500" />;
      case 'attention_needed':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: ScriptExecutionStatus['status']) => {
    switch (status) {
      case 'pending':
        return language === 'zh' ? '等待' : 'Pending';
      case 'running':
        return language === 'zh' ? '执行中' : 'Running';
      case 'completed':
        return language === 'zh' ? '完成' : 'Complete';
      case 'failed':
        return language === 'zh' ? '失败' : 'Failed';
      case 'attention_needed':
        return language === 'zh' ? '关注' : 'Attention';
      default:
        return status;
    }
  };

  const getStatusColor = (status: ScriptExecutionStatus['status']) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'running':
        return 'default';
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'attention_needed':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const formatDuration = (startTime?: Date, endTime?: Date) => {
    if (!startTime) return '-';
    const end = endTime || new Date();
    const duration = Math.floor((end.getTime() - startTime.getTime()) / 1000);
    
    if (duration < 60) {
      return `${duration}s`;
    } else if (duration < 3600) {
      return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    } else {
      return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className={`w-full max-w-6xl bg-background shadow-2xl transition-all duration-300 ${
        isMinimized ? 'h-auto' : 'max-h-[90vh]'
      }`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 ring-2 ring-primary/20">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  {language === 'zh' ? '批量执行进度' : 'Batch Execution Progress'}
                  {isExecuting && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </CardTitle>
                <CardDescription>
                  {language === 'zh' 
                    ? `执行进度: ${stats.completed + stats.failed + stats.attention}/${stats.total} 个脚本`
                    : `Progress: ${stats.completed + stats.failed + stats.attention}/${stats.total} scripts`
                  }
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0"
              >
                <TrendingUp className={`h-4 w-4 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
              </Button>
              {isExecuting && onCancel && (
                <Button variant="outline" size="sm" onClick={onCancel}>
                  {language === 'zh' ? '取消' : 'Cancel'}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{language === 'zh' ? '整体进度' : 'Overall Progress'}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <div className="text-center p-2 bg-muted/20 rounded-lg">
              <div className="text-lg font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground">
                {language === 'zh' ? '总计' : 'Total'}
              </div>
            </div>
            <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{stats.running}</div>
              <div className="text-xs text-muted-foreground">
                {language === 'zh' ? '执行中' : 'Running'}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-800/20 rounded-lg">
              <div className="text-lg font-bold text-gray-600">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">
                {language === 'zh' ? '等待' : 'Pending'}
              </div>
            </div>
            <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-lg font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs text-muted-foreground">
                {language === 'zh' ? '成功' : 'Success'}
              </div>
            </div>
            <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <div className="text-lg font-bold text-orange-600">{stats.attention}</div>
              <div className="text-xs text-muted-foreground">
                {language === 'zh' ? '关注' : 'Attention'}
              </div>
            </div>
            <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div className="text-lg font-bold text-red-600">{stats.failed}</div>
              <div className="text-xs text-muted-foreground">
                {language === 'zh' ? '失败' : 'Failed'}
              </div>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="pt-0">
            <Separator className="mb-4" />
            
            {/* Script List */}
            <ScrollArea className="h-96 pr-4">
              <div className="space-y-3">
                {scripts.map((script, index) => (
                  <div
                    key={script.scriptId}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-200 ${
                      script.status === 'running'
                        ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20'
                        : script.status === 'failed'
                        ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
                        : script.status === 'attention_needed'
                        ? 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20'
                        : script.status === 'completed'
                        ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20'
                        : 'border-border bg-background'
                    }`}
                  >
                    {/* 左侧：序号和状态图标 */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-mono text-muted-foreground w-8 text-center">
                        #{index + 1}
                      </span>
                      {getStatusIcon(script.status)}
                    </div>

                    {/* 中间：脚本信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground truncate max-w-md">
                          {script.scriptName || script.scriptId}
                        </h4>
                        {script.isScheduled && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {language === 'zh' ? '定时' : 'Scheduled'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate max-w-md">
                        {script.scriptId}
                      </p>
                      {script.message && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-md" title={script.message}>
                          {script.message}
                        </p>
                      )}
                    </div>

                    {/* 右侧：状态和时间 */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0 min-w-[120px]">
                      <Badge variant={getStatusColor(script.status)} className="text-xs whitespace-nowrap">
                        {getStatusText(script.status)}
                      </Badge>
                      <div className="text-xs text-muted-foreground text-right">
                        {formatDuration(script.startTime, script.endTime)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Status Message */}
            {isCompleted && (
              <Alert className="mt-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {language === 'zh'
                    ? `批量执行完成！成功: ${stats.completed}, 需要关注: ${stats.attention}, 失败: ${stats.failed}`
                    : `Batch execution completed! Success: ${stats.completed}, Attention: ${stats.attention}, Failed: ${stats.failed}`
                  }
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 mt-4">
              {isCompleted && (
                <Button onClick={onClose}>
                  {language === 'zh' ? '关闭' : 'Close'}
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}; 