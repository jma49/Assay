/** @jsxImportSource react */
import React, { useState, useEffect } from 'react';
import { Database, List, Loader2, Play, Calendar, User, Book, FileText, ChevronRight, Zap, Settings2, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DashboardTranslationKeys, ScriptInfo } from './types';
import { BatchExecutionProgress, ScriptExecutionStatus } from './BatchExecutionProgress';
import { formatDate } from './utils';
import { toast } from 'sonner';

interface ManualTriggerProps {
  availableScripts: ScriptInfo[];
  selectedScriptId: string;
  selectedScript: ScriptInfo | undefined;
  isTriggering: boolean;
  isFetchingScripts: boolean;
  loading: boolean;
  triggerMessage: string | null;
  triggerMessageType: 'success' | 'error' | null;
  language: string;
  t: (key: DashboardTranslationKeys) => string;
  setSelectedScriptId: (id: string) => void;
  handleTriggerCheck: () => void;
}

export const ManualTrigger: React.FC<ManualTriggerProps> = ({
  availableScripts,
  selectedScriptId,
  selectedScript,
  isTriggering,
  isFetchingScripts,
  loading,
  triggerMessage,
  triggerMessageType,
  language,
  t,
  setSelectedScriptId,
  handleTriggerCheck
}) => {
  // 新增状态
  const [executionMode, setExecutionMode] = useState<'single' | 'bulk'>('single');
  const [bulkMode, setBulkMode] = useState<'all' | 'scheduled'>('all');
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  
  // 批量执行进度相关状态
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [executionScripts, setExecutionScripts] = useState<ScriptExecutionStatus[]>([]);

  // 当选中的脚本变化时的处理
  React.useEffect(() => {
    if (selectedScript) {
      console.log("选中的脚本完整数据:", JSON.stringify(selectedScript, null, 2));
    }
  }, [selectedScript]);
  
  // 确保选中的脚本始终有值（仅在single模式下）
  React.useEffect(() => {
    if (executionMode === 'single' && !selectedScriptId && availableScripts.length > 0) {
      console.log("自动选择第一个脚本:", availableScripts[0].scriptId);
      setSelectedScriptId(availableScripts[0].scriptId);
    }
  }, [availableScripts, selectedScriptId, setSelectedScriptId, executionMode]);
  
  // 轮询批量执行状态
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const pollExecutionStatus = async () => {
      if (!currentExecutionId) return;

      try {
        const response = await fetch(`/api/batch-execution-status?executionId=${currentExecutionId}`);
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const executionData = result.data as {
              scripts: Array<{
                scriptId: string;
                scriptName: string;
                isScheduled: boolean;
                status: 'pending' | 'running' | 'completed' | 'failed' | 'attention_needed';
                startTime?: string;
                endTime?: string;
                message?: string;
                findings?: string;
                mongoResultId?: string;
              }>;
              isActive: boolean;
            };
            
            // 更新脚本状态
            setExecutionScripts(executionData.scripts.map((script) => ({
              scriptId: script.scriptId,
              scriptName: script.scriptName,
              isScheduled: script.isScheduled,
              status: script.status,
              startTime: script.startTime ? new Date(script.startTime) : undefined,
              endTime: script.endTime ? new Date(script.endTime) : undefined,
              message: script.message,
              findings: script.findings,
              mongoResultId: script.mongoResultId
            })));

            // 如果执行完成，停止轮询
            if (!executionData.isActive) {
              setIsRunningBatch(false);
              if (intervalId) {
                clearInterval(intervalId);
              }

              // 显示完成通知
              const stats = {
                completed: executionData.scripts.filter((s) => s.status === 'completed').length,
                attention: executionData.scripts.filter((s) => s.status === 'attention_needed').length,
                failed: executionData.scripts.filter((s) => s.status === 'failed').length,
              };

              toast.success(
                language === 'zh' ? '批量执行完成' : 'Batch execution completed',
                {
                  description: language === 'zh' 
                    ? `成功: ${stats.completed}, 需要关注: ${stats.attention}, 失败: ${stats.failed}`
                    : `Success: ${stats.completed}, Attention: ${stats.attention}, Failed: ${stats.failed}`,
                  duration: 5000,
                }
              );
            }
          }
        } else if (response.status === 404) {
          // 执行状态不存在，停止轮询
          console.log('执行状态已被清理，停止轮询');
          if (intervalId) {
            clearInterval(intervalId);
          }
          setIsRunningBatch(false);
        }
      } catch (error) {
        console.error('轮询执行状态失败:', error);
      }
    };

    if (currentExecutionId && isRunningBatch) {
      // 立即获取一次状态
      pollExecutionStatus();
      
      // 每2秒轮询一次状态
      intervalId = setInterval(pollExecutionStatus, 2000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentExecutionId, isRunningBatch, language]);

  // 获取显示的描述文本（根据语言）
  const getLocalizedField = (field: string | undefined, cnField?: string): string => {
    const defaultField = field ?? '-';
    if (language === 'zh' && cnField) {
      return cnField;
    }
    return defaultField;
  };
  
  const noScriptDesc = t('noScriptDesc') || "No description available for this script.";
  
  // 获取当前显示的描述文本
  const scriptDescription = selectedScript 
    ? getLocalizedField(selectedScript.description, selectedScript.cnDescription) 
    : noScriptDesc;
    
  // 获取当前显示的范围文本
  const scriptScope = selectedScript 
    ? getLocalizedField(selectedScript.scope, selectedScript.cnScope) 
    : '-';

  // 过滤脚本列表（用于搜索）
  const filteredScripts = availableScripts.filter((script) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const name = (language === 'zh' && script.cnName ? script.cnName : script.name).toLowerCase();
    const description = getLocalizedField(script.description, script.cnDescription).toLowerCase();
    return name.includes(searchLower) || description.includes(searchLower) || script.scriptId.toLowerCase().includes(searchLower);
  });

  // 批量执行处理函数
  const handleBatchExecution = async () => {
    setIsRunningBatch(true);
    setShowBatchDialog(false);

    try {
      const response = await fetch('/api/run-all-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode: bulkMode
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || t('batchExecutionFailed'));
      }

      // 设置执行ID和显示进度对话框
      if (result.executionId) {
        setCurrentExecutionId(result.executionId);
        setShowProgressDialog(true);
        
        // 初始化脚本状态
        const scriptsToExecute = bulkMode === 'scheduled' 
          ? availableScripts.filter(script => script.isScheduled)
          : availableScripts;
          
        setExecutionScripts(scriptsToExecute.map(script => ({
          scriptId: script.scriptId,
          scriptName: script.name || script.scriptId,
          isScheduled: script.isScheduled || false,
          status: 'pending'
        })));
      }

      const successMessage = result.localizedMessage || result.message || t('batchExecutionStartedDesc');
      
      toast.success(t('batchExecutionStarted'), {
        description: successMessage,
        duration: 5000,
      });

    } catch (error) {
      console.error("批量执行失败:", error);
      const errorMessage = error instanceof Error ? error.message : t('batchExecutionFailed');
      
      toast.error(t('batchExecutionFailed'), {
        description: errorMessage,
        duration: 8000,
      });
      
      setIsRunningBatch(false);
    }
  };

  // 关闭进度对话框
  const handleCloseProgressDialog = () => {
    setShowProgressDialog(false);
    setCurrentExecutionId(null);
    setExecutionScripts([]);
  };

  // 取消批量执行
  const handleCancelBatchExecution = () => {
    setIsRunningBatch(false);
    setCurrentExecutionId(null);
    // 这里可以添加取消API调用的逻辑
    toast.info(
      language === 'zh' ? '批量执行已取消' : 'Batch execution cancelled',
      { duration: 3000 }
    );
  };

  // 获取批量执行脚本数量
  const getBatchScriptCount = () => {
    if (bulkMode === 'scheduled') {
      return availableScripts.filter(script => script.isScheduled).length;
    }
    return availableScripts.length;
  };

  return (
    <>
      <Card className="group relative overflow-hidden border-2 border-primary/10 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-primary/20">
        {/* 装饰性背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
        
        <CardHeader className="relative px-6 py-5 border-b border-border/30">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20 group-hover:ring-primary/30 transition-all duration-300">
              <List className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div className="space-y-1 flex-1">
              <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                {t('manualTrigger')}
                <ChevronRight className="h-4 w-4 text-primary" />
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                {t('selectScriptDesc')}
              </CardDescription>
            </div>
            {/* 执行模式指示器 */}
            <div className="flex items-center gap-2">
              <Badge variant={executionMode === 'single' ? 'default' : 'secondary'} className="text-xs">
                {executionMode === 'single' ? t('singleExecution') : t('bulkExecution')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="relative px-6 py-6 space-y-6">
          {isFetchingScripts ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground space-x-3">
              <Loader2 className="animate-spin h-6 w-6 text-primary" />
              <span className="text-lg font-medium">{t('loadingScripts')}</span>
            </div>
          ) : availableScripts.length > 0 ? (
            <div className="space-y-6">
              {/* 执行模式选择 */}
              <div className="space-y-4">
                <Label className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  {t('executionMode')}
                </Label>
                <RadioGroup 
                  value={executionMode} 
                  onValueChange={(value) => setExecutionMode(value as 'single' | 'bulk')}
                  className="flex space-x-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                      <Play className="h-3.5 w-3.5 text-primary" />
                      {t('executeSelectedScript')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bulk" id="bulk" />
                    <Label htmlFor="bulk" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-orange-500" />
                      {t('executeAllScripts')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {executionMode === 'single' ? (
                <>
                  {/* 脚本搜索 */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Search className="h-3.5 w-3.5" />
                      {t('searchScripts')}
                    </Label>
                    <Input
                      placeholder={t('searchScriptsPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-10"
                    />
                  </div>

                  {/* Script Selection */}
                  <div className="space-y-3">
                    <Label htmlFor="script-select" className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Database className="h-4 w-4 text-primary" />
                      {t('selectScriptLabel')}
                      {filteredScripts.length !== availableScripts.length && (
                        <Badge variant="outline" className="text-xs">
                          {filteredScripts.length}/{availableScripts.length}
                        </Badge>
                      )}
                    </Label>
                    <Select 
                      value={selectedScriptId} 
                      onValueChange={setSelectedScriptId} 
                      disabled={isTriggering || loading}
                    >
                      <SelectTrigger 
                        id="script-select" 
                        className="h-12 text-base border-2 border-border/50 hover:border-primary/30 focus:border-primary/50 transition-colors duration-200 bg-background/50"
                      >
                        <SelectValue placeholder={t('selectScriptPlaceholder') || "选择一个脚本"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {filteredScripts.length > 0 ? (
                          filteredScripts.map((script) => {
                            let displayName = script.name;
                            if (language === 'zh' && script.cnName) {
                              displayName = script.cnName;
                            }
                            return (
                              <SelectItem key={script.scriptId} value={script.scriptId} className="py-3">
                                <div className="flex items-center gap-3 w-full">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-primary/40" />
                                    <span className="font-medium">{displayName}</span>
                                  </div>
                                  {script.isScheduled && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/20">
                                      {t('scheduledTask')}
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-muted-foreground text-sm">
                            {t('noMatchingScripts')}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Script Details */}
                  {selectedScript && (
                    <div className="bg-gradient-to-r from-background/80 to-background/60 rounded-xl border-2 border-border/30 shadow-md overflow-hidden">
                      <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-3 border-b border-border/20">
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          {t('scriptDetails')}
                          {selectedScript.isScheduled && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/20 dark:text-blue-400">
                              <Calendar className="h-3 w-3 mr-1" />
                              {t('scheduledTask')}
                            </Badge>
                          )}
                        </h4>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <Book className="h-3.5 w-3.5" />
                              {t('description')}
                            </h5>
                            <p className="text-sm text-foreground leading-relaxed bg-muted/20 rounded-lg p-3">
                              {scriptDescription}
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <Database className="h-3.5 w-3.5" />
                              {t('scope')}
                            </h5>
                            <p className="text-sm text-foreground bg-muted/20 rounded-lg p-3">
                              {scriptScope}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              {t('author')}
                            </h5>
                            <p className="text-sm text-foreground bg-muted/20 rounded-lg p-3">
                              {selectedScript.author || t('unknown')}
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {t('createdAt')}
                            </h5>
                            <p className="text-sm text-foreground bg-muted/20 rounded-lg p-3">
                              {selectedScript.createdAt ? formatDate(selectedScript.createdAt.toISOString(), language) : t('unknown')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Single Execution Button */}
                  <div className="pt-2">
                    <Button
                      onClick={handleTriggerCheck}
                      disabled={!selectedScriptId || isTriggering || loading}
                      size="lg"
                      className="w-full h-14 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 group/btn"
                    >
                      {isTriggering ? (
                        <>
                          <Loader2 className="animate-spin mr-3 h-5 w-5" />
                          {t('runningCheck')}
                        </>
                      ) : (
                        <>
                          <Play className="mr-3 h-5 w-5 group-hover/btn:scale-110 transition-transform duration-200" />
                          {t('runCheck')}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* 批量执行模式选择 */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Zap className="h-4 w-4 text-orange-500" />
                      {t('bulkExecution')}
                    </Label>
                    <div className="bg-gradient-to-r from-orange-50/50 to-yellow-50/50 dark:from-orange-950/20 dark:to-yellow-950/20 rounded-lg border border-orange-200/60 dark:border-orange-800/60 p-4">
                      <RadioGroup 
                        value={bulkMode} 
                        onValueChange={(value) => setBulkMode(value as 'all' | 'scheduled')}
                        className="space-y-3"
                      >
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="all" id="all" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="all" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              {t('executeAllScriptsOption')}
                              <Badge variant="outline" className="text-xs">
                                {availableScripts.length}
                              </Badge>
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('executeAllScriptsDesc')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value="scheduled" id="scheduled" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="scheduled" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-blue-600" />
                              {t('executeScheduledScriptsOption')}
                              <Badge variant="outline" className="text-xs">
                                {availableScripts.filter(script => script.isScheduled).length}
                              </Badge>
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('executeScheduledScriptsDesc')}
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  {/* 批量执行统计 */}
                  <div className="bg-gradient-to-r from-background/80 to-background/60 rounded-xl border-2 border-border/30 shadow-md p-5">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                      <Database className="h-4 w-4 text-primary" />
                      {t('scriptsExecutionProgress')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted/20 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{getBatchScriptCount()}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('scriptsToExecute')}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {availableScripts.filter(script => script.isScheduled).length}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('scheduledScripts')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Batch Execution Button */}
                  <div className="pt-2">
                    <AlertDialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
                      <AlertDialogTrigger asChild>
                        <Button
                          disabled={isRunningBatch || getBatchScriptCount() === 0}
                          size="lg"
                          className="w-full h-14 text-base font-semibold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transition-all duration-300 group/btn"
                        >
                          {isRunningBatch ? (
                            <>
                              <Loader2 className="animate-spin mr-3 h-5 w-5" />
                              {t('runningAllScripts')}
                            </>
                          ) : (
                            <>
                              <Zap className="mr-3 h-5 w-5 group-hover/btn:scale-110 transition-transform duration-200" />
                              {t('runAllScripts')} ({getBatchScriptCount()})
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                            {t('runAllScriptsConfirm')}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('runAllScriptsConfirmDesc')}
                            <br />
                            <span className="font-medium">
                              {bulkMode === 'scheduled' 
                                ? t('batchExecutionConfirmScheduledMessage').replace('{count}', getBatchScriptCount().toString())
                                : t('batchExecutionConfirmMessage').replace('{count}', getBatchScriptCount().toString())
                              }
                            </span>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel>
                          <AlertDialogAction onClick={handleBatchExecution} className="bg-orange-500 hover:bg-orange-600">
                            {t('runAllScripts')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}

              {/* Status Message */}
              {triggerMessage && (
                <Alert variant={triggerMessageType === 'error' ? "destructive" : "default"} className="mt-3 shadow-sm slide-in-right transition-all duration-300">
                  <AlertTitle>
                    {triggerMessageType === 'error' ? t('triggerErrorTitle') : t('triggerSuccessTitle')}
                  </AlertTitle>
                  <AlertDescription>
                    {triggerMessage}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="text-center py-8 px-4 bg-card/50 rounded-lg border border-border/30 shadow-sm h-full flex flex-col justify-center">
              <div className="icon-container bg-muted/30 rounded-lg p-2 mx-auto mb-4">
                <Database className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="font-semibold text-base">{t('noScriptsAvailable')}</p>
              <p className="text-sm text-muted-foreground mt-2">{t('ensureConfigured')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 批量执行进度对话框 */}
      <BatchExecutionProgress
        isVisible={showProgressDialog}
        scripts={executionScripts}
        onClose={handleCloseProgressDialog}
        onCancel={isRunningBatch ? handleCancelBatchExecution : undefined}
        language={language}
      />
    </>
  );
}; 