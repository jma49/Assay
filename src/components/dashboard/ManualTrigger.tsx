/** @jsxImportSource react */
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Database,
  List,
  Loader2,
  Play,
  Calendar,
  User,
  Book,
  FileText,
  ChevronRight,
  Zap,
  Settings2,
  Search,
  CheckCircle2,
  AlertCircle,
  Hash,
  Check,
  CornerDownLeft,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { DashboardTranslationKeys, ScriptInfo } from "./types";
import {
  BatchExecutionProgress,
  ScriptExecutionStatus,
} from "./BatchExecutionProgress";
import { formatDate } from "./utils";
import { toast } from "sonner";

interface ManualTriggerProps {
  availableScripts: ScriptInfo[];
  selectedScriptId: string;
  selectedScript: ScriptInfo | undefined;
  isTriggering: boolean;
  isFetchingScripts: boolean;
  loading: boolean;
  triggerMessage: string | null;
  triggerMessageType: "success" | "error" | null;
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
  handleTriggerCheck,
}) => {
  // 状态管理
  const [executionMode, setExecutionMode] = useState<"single" | "bulk">(
    "single",
  );
  const [bulkMode, setBulkMode] = useState<"all" | "scheduled">("scheduled");
  const [searchTerm, setSearchTerm] = useState("");
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(
    null,
  );
  const [executionScripts, setExecutionScripts] = useState<
    ScriptExecutionStatus[]
  >([]);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showHashtagDropdown, setShowHashtagDropdown] = useState(false);

  // AbortController refs for cancelling requests
  const batchExecutionAbortRef = useRef<AbortController | null>(null);
  const statusPollAbortRef = useRef<AbortController | null>(null);

  // 使用ref来存储之前的值，避免依赖问题
  const isInitializedRef = useRef<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 稳定的状态更新函数，避免重新渲染时创建新的函数引用
  const stableSetExecutionMode = useCallback((mode: "single" | "bulk") => {
    setExecutionMode(mode);
  }, []);

  const stableSetBulkMode = useCallback((mode: "all" | "scheduled") => {
    setBulkMode(mode);
  }, []);

  // 稳定的筛选函数
  const getFilteredScripts = useCallback((scripts: ScriptInfo[], term: string) => {
    if (!Array.isArray(scripts) || scripts.length === 0) {
      return [];
    }

    let filtered = scripts;
    const trimmedTerm = term.trim();
    
    if (trimmedTerm) {
      const searchTerm = trimmedTerm.toLowerCase();
      
      // 检查是否包含hashtag搜索（#tag格式）
      const hashtagMatches = searchTerm.match(/#(\w+)/g);
      const extractedHashtags = hashtagMatches ? hashtagMatches.map(tag => tag.substring(1)) : [];
      
      // 移除hashtag部分，保留普通搜索文本
      const textSearchTerm = searchTerm.replace(/#\w+/g, '').trim();
      
      filtered = filtered.filter(script => {
        let matches = true;
        
        // 普通文本搜索
        if (textSearchTerm) {
          matches = matches && (
            script.scriptId.toLowerCase().includes(textSearchTerm) ||
            script.name.toLowerCase().includes(textSearchTerm) ||
            (script.cnName || "").toLowerCase().includes(textSearchTerm) ||
            (script.description || "").toLowerCase().includes(textSearchTerm) ||
            (script.cnDescription || "").toLowerCase().includes(textSearchTerm)
          );
        }
        
        // Hashtag搜索
        if (extractedHashtags.length > 0) {
          const hasAllHashtags = script.hashtags && 
            extractedHashtags.every(tag => 
              script.hashtags?.some(scriptTag => 
                scriptTag.toLowerCase().includes(tag.toLowerCase())
              )
            );
          matches = matches && Boolean(hasAllHashtags);
        }
        
        return matches;
      });
    }

    return filtered;
  }, []);

  // 新增：获取所有可用的hashtag
  const availableHashtags = useMemo(() => {
    const hashtagSet = new Set<string>();
    if (Array.isArray(availableScripts)) {
      availableScripts.forEach(script => {
        if (script.hashtags && Array.isArray(script.hashtags)) {
          script.hashtags.forEach(tag => hashtagSet.add(tag));
        }
      });
    }
    return Array.from(hashtagSet).sort();
  }, [availableScripts]);

  // 计算筛选后的脚本 - 简化版本，避免复杂的缓存逻辑
  const filteredScripts = useMemo(() => {
    return getFilteredScripts(availableScripts, searchTerm);
  }, [availableScripts, searchTerm, getFilteredScripts]);

  // 处理hashtag输入变化
  const handleHashtagInput = useCallback((value: string) => {
    const prevSearchTerm = searchTerm;
    setSearchTerm(value);
    
    // 检查是否正在输入hashtag
    const isHashtagInput = value.includes('#');
    setShowHashtagDropdown(isHashtagInput && availableHashtags.length > 0);
    
    // 当搜索词变化且不是在显示hashtag下拉框时，显示搜索结果提示
    if (value.trim() && value !== prevSearchTerm && !isHashtagInput) {
      const filtered = getFilteredScripts(availableScripts, value);
      if (filtered.length !== availableScripts.length) {
        toast.info(
          language === "zh"
            ? `找到 ${filtered.length} 个匹配的脚本`
            : `Found ${filtered.length} matching scripts`,
          {
            duration: 2000,
            position: "bottom-right",
          }
        );
      }
    }
  }, [availableHashtags.length, searchTerm, getFilteredScripts, availableScripts, language]);

  // 处理hashtag选择
  const handleHashtagSelect = useCallback((tag: string) => {
    // 移除搜索词中最后一个不完整的hashtag
    const currentSearch = searchTerm.replace(/#\w*$/, '');
    const newSearchTerm = `${currentSearch}#${tag}`.trim();
    setSearchTerm(newSearchTerm);
    setShowHashtagDropdown(false);
    
    // 延迟聚焦，确保下拉框先关闭
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  }, [searchTerm]);

  // 处理hashtag确认
  const handleHashtagConfirm = useCallback(() => {
    setShowHashtagDropdown(false);
    // 让输入框失去焦点，显示筛选结果
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  }, []);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && showHashtagDropdown) {
      e.preventDefault();
      handleHashtagConfirm();
    } else if (e.key === 'Escape') {
      setShowHashtagDropdown(false);
    }
  }, [showHashtagDropdown, handleHashtagConfirm]);

  // 监听点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showHashtagDropdown && searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        const dropdown = document.querySelector('[data-hashtag-dropdown]');
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setShowHashtagDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHashtagDropdown]);

  // 获取显示的描述文本（根据语言）
  const getLocalizedField = (
    field: string | undefined,
    cnField?: string,
  ): string => {
    const defaultField = field ?? "-";
    if (language === "zh" && cnField) {
      return cnField;
    }
    return defaultField;
  };

  const noScriptDesc =
    t("noScriptDesc") || "No description available for this script.";

  // 获取当前显示的描述文本
  const scriptDescription = selectedScript
    ? getLocalizedField(
        selectedScript.description,
        selectedScript.cnDescription,
      )
    : noScriptDesc;

  // 获取当前显示的范围文本
  const scriptScope = selectedScript
    ? getLocalizedField(selectedScript.scope, selectedScript.cnScope)
    : "-";

  // 简化的脚本选择逻辑 - 只在必要时更新，避免循环
  useEffect(() => {
    // 只在初始加载时自动选择第一个脚本
    if (
      !isInitializedRef.current &&
      !selectedScriptId && 
      Array.isArray(availableScripts) && 
      availableScripts.length > 0
    ) {
      // 延迟选择，避免渲染期间状态更新
      setTimeout(() => {
        setSelectedScriptId(availableScripts[0].scriptId);
      }, 0);
      isInitializedRef.current = true;
    }
    
    // 重置初始化状态当脚本列表为空时
    if (availableScripts.length === 0) {
      isInitializedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableScripts.length]); // 仅依赖脚本数量，不依赖其他可变状态避免循环

  // 轮询批量执行状态
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const pollExecutionStatus = async () => {
      if (!currentExecutionId || !isRunningBatch) return;

      try {
        // 取消之前的请求
        if (statusPollAbortRef.current) {
          statusPollAbortRef.current.abort();
        }

        // 创建新的AbortController
        statusPollAbortRef.current = new AbortController();

        const response = await fetch(
          `/api/batch-execution-status?executionId=${currentExecutionId}`,
          {
            signal: statusPollAbortRef.current.signal,
          },
        );

        if (response.ok) {
          const result = await response.json();
          const executionData = result.data;

          if (executionData && executionData.scripts) {
            // 转换时间字符串为Date对象并更新状态
            const updatedScripts = executionData.scripts.map(
              (script: {
                scriptId: string;
                scriptName: string;
                isScheduled: boolean;
                status:
                  | "pending"
                  | "running"
                  | "completed"
                  | "failed"
                  | "attention_needed";
                startTime?: string;
                endTime?: string;
                message?: string;
                findings?: string;
                mongoResultId?: string;
              }) => ({
                ...script,
                startTime: script.startTime
                  ? new Date(script.startTime)
                  : undefined,
                endTime: script.endTime ? new Date(script.endTime) : undefined,
              }),
            );

            setExecutionScripts(updatedScripts);

            // 检查是否执行完成
            if (!executionData.isActive) {
              setIsRunningBatch(false);
              if (intervalId) {
                clearInterval(intervalId);
              }

              // 显示完成通知
              const stats = {
                completed: updatedScripts.filter(
                  (s: ScriptExecutionStatus) => s.status === "completed",
                ).length,
                attention: updatedScripts.filter(
                  (s: ScriptExecutionStatus) => s.status === "attention_needed",
                ).length,
                failed: updatedScripts.filter(
                  (s: ScriptExecutionStatus) => s.status === "failed",
                ).length,
              };

              toast.success(
                language === "zh"
                  ? "批量执行完成"
                  : "Batch execution completed",
                {
                  description:
                    language === "zh"
                      ? `成功: ${stats.completed}, 需要关注: ${stats.attention}, 失败: ${stats.failed}`
                      : `Success: ${stats.completed}, Attention: ${stats.attention}, Failed: ${stats.failed}`,
                  duration: 5000,
                },
              );
            }
          }
        } else if (response.status === 404) {
          // 执行状态不存在，停止轮询
          if (process.env.NODE_ENV === "development") {
            console.log("执行状态已被清理，停止轮询");
          }
          if (intervalId) {
            clearInterval(intervalId);
          }
          setIsRunningBatch(false);
        }
      } catch (error) {
        // 忽略被取消的请求
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        if (process.env.NODE_ENV === "development") {
          console.error("轮询执行状态失败:", error);
        }
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
      // 取消正在进行的状态轮询请求
      if (statusPollAbortRef.current) {
        statusPollAbortRef.current.abort();
      }
    };
  }, [currentExecutionId, isRunningBatch, language]);

  // 获取批量执行的脚本列表
  const getBatchScripts = useCallback(() => {
    let scriptsToExecute = filteredScripts;

    if (bulkMode === "scheduled") {
      scriptsToExecute = scriptsToExecute.filter((script) => script.isScheduled);
    }
    
    return scriptsToExecute;
  }, [filteredScripts, bulkMode]);

  // 检查是否为筛选执行
  const isFilteredExecution = useCallback(() => {
    // 如果有搜索词（包括hashtag搜索），或者筛选后的脚本数量小于总脚本数量，则认为是筛选执行
    const hasSearchTerm = searchTerm.trim().length > 0;
    const isFiltered = filteredScripts.length < availableScripts.length;
    
    return hasSearchTerm || isFiltered;
  }, [searchTerm, filteredScripts.length, availableScripts.length]);

  // 批量执行处理函数
  const handleBatchExecution = useCallback(async () => {
    // 取消之前的批量执行请求
    if (batchExecutionAbortRef.current) {
      batchExecutionAbortRef.current.abort();
    }

    // 创建新的AbortController
    batchExecutionAbortRef.current = new AbortController();

    setIsRunningBatch(true);
    setShowBatchDialog(false);

    try {
      // 获取要执行的脚本列表（已筛选）
      const scriptsToExecute = getBatchScripts();
      const scriptIds = scriptsToExecute.map(script => script.scriptId);
      const isFiltered = isFilteredExecution();

      if (process.env.NODE_ENV === "development") {
        console.log('🔍 批量执行调试信息:', {
          searchTerm: searchTerm,
          totalAvailableScripts: availableScripts.length,
          filteredScriptsCount: filteredScripts.length,
          scriptsToExecuteCount: scriptsToExecute.length,
          isFiltered: isFiltered,
          bulkMode: bulkMode,
          scriptIds: scriptIds
        });
      }

      const response = await fetch("/api/run-all-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: bulkMode,
          scriptIds: scriptIds, // 发送筛选后的脚本ID列表
          filteredExecution: isFiltered, // 使用更准确的筛选判断
        }),
        signal: batchExecutionAbortRef.current.signal,
      });

      const result = await response.json();

      if (process.env.NODE_ENV === "development") {
        console.log('📡 API响应结果:', result);
      }

      if (!response.ok) {
        throw new Error(result.message || t("batchExecutionFailed"));
      }

      // 设置执行ID和显示进度对话框
      if (result.executionId) {
        setCurrentExecutionId(result.executionId);
        setShowProgressDialog(true);

        // 初始化脚本状态（使用筛选后的脚本）
        setExecutionScripts(
          scriptsToExecute.map((script) => ({
            scriptId: script.scriptId,
            scriptName: script.name || script.scriptId,
            isScheduled: script.isScheduled || false,
            status: "pending",
          })),
        );
      }

      const successMessage =
        result.localizedMessage ||
        result.message ||
        t("batchExecutionStartedDesc");

      toast.success(t("batchExecutionStarted"), {
        description: successMessage,
        duration: 5000,
      });
    } catch (error) {
      // 忽略被取消的请求
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.error("批量执行失败:", error);
      }

      const errorMessage =
        error instanceof Error ? error.message : t("batchExecutionFailed");

      toast.error(t("batchExecutionFailed"), {
        description: errorMessage,
        duration: 8000,
      });

      setIsRunningBatch(false);
    }
  }, [bulkMode, getBatchScripts, isFilteredExecution, searchTerm, availableScripts.length, filteredScripts.length, t]);

  // 关闭进度对话框
  const handleCloseProgressDialog = useCallback(() => {
    // 取消所有正在进行的请求
    if (batchExecutionAbortRef.current) {
      batchExecutionAbortRef.current.abort();
    }
    if (statusPollAbortRef.current) {
      statusPollAbortRef.current.abort();
    }

    setShowProgressDialog(false);
    setCurrentExecutionId(null);
    setExecutionScripts([]);
    setIsRunningBatch(false);
  }, []);

  // 取消批量执行
  const handleCancelBatchExecution = useCallback(() => {
    // 取消所有正在进行的请求
    if (batchExecutionAbortRef.current) {
      batchExecutionAbortRef.current.abort();
    }
    if (statusPollAbortRef.current) {
      statusPollAbortRef.current.abort();
    }

    setIsRunningBatch(false);
    setCurrentExecutionId(null);

    toast.info(
      language === "zh" ? "批量执行已取消" : "Batch execution cancelled",
      { duration: 3000 },
    );
  }, [language]);

  // 获取批量执行脚本数量
  const getBatchScriptCount = () => {
    // 使用筛选后的脚本列表
    let scriptsToCount = filteredScripts;

    if (bulkMode === "scheduled") {
      scriptsToCount = scriptsToCount.filter((script) => script.isScheduled);
    }
    
    return scriptsToCount.length;
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
                {t("manualTrigger")}
                <ChevronRight className="h-4 w-4 text-primary" />
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                {t("selectScriptDesc")}
              </CardDescription>
            </div>
            {/* 执行模式指示器 */}
            <div className="flex items-center gap-2">
              <Badge
                variant={executionMode === "single" ? "default" : "secondary"}
                className="text-xs"
              >
                {executionMode === "single"
                  ? t("singleExecution")
                  : t("bulkExecution")}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative px-6 py-6 space-y-6">
          {isFetchingScripts ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground space-x-3">
              <Loader2 className="animate-spin h-6 w-6 text-primary" />
              <span className="text-lg font-medium">{t("loadingScripts")}</span>
            </div>
          ) : Array.isArray(availableScripts) && availableScripts.length > 0 ? (
            <div className="space-y-6">
              {/* 执行模式选择 */}
              <div className="space-y-4">
                <Label className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  {t("executionMode")}
                </Label>
                <RadioGroup
                  value={executionMode}
                  onValueChange={(value) =>
                    stableSetExecutionMode(value as "single" | "bulk")
                  }
                  className="flex space-x-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="single" />
                    <Label
                      htmlFor="single"
                      className="text-sm font-medium cursor-pointer flex items-center gap-2"
                    >
                      <Play className="h-3.5 w-3.5 text-primary" />
                      {t("executeSelectedScript")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bulk" id="bulk" />
                    <Label
                      htmlFor="bulk"
                      className="text-sm font-medium cursor-pointer flex items-center gap-2"
                    >
                      <Zap className="h-3.5 w-3.5 text-orange-500" />
                      {t("executeAllScripts")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {executionMode === "single" ? (
                <>
                  {/* 脚本搜索 */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Search className="h-3.5 w-3.5" />
                      {t("searchScripts")}
                    </Label>
                    <div className="relative">
                      <Input
                        ref={searchInputRef}
                        placeholder={language === "zh" ? "搜索脚本名称或使用 #标签 筛选..." : "Search scripts or use #tag to filter..."}
                        value={searchTerm}
                        onChange={(e) => handleHashtagInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="h-10"
                      />
                      {/* Hashtag建议 */}
                      {showHashtagDropdown && availableHashtags.length > 0 && (
                        <div 
                          data-hashtag-dropdown
                          className="absolute top-full left-0 right-0 mt-1 bg-card border-2 border-border/30 rounded-lg shadow-lg z-50 max-h-48 overflow-hidden"
                        >
                          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border/20 bg-muted/20 flex items-center justify-between">
                            <span>{language === "zh" ? "点击选择标签筛选脚本：" : "Click to filter scripts by tag:"}</span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground/80">
                              <CornerDownLeft className="h-3 w-3" />
                              <span>{language === "zh" ? "回车确认" : "Enter to confirm"}</span>
                            </div>
                          </div>
                          <div className="max-h-32 overflow-y-auto">
                            <div className="p-2 space-y-1">
                              {availableHashtags.map((tag) => (
                                <button
                                  key={tag}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 rounded-md flex items-center gap-2 transition-all duration-200 group"
                                  onClick={() => handleHashtagSelect(tag)}
                                >
                                  <Hash className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{tag}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="border-t border-border/20 p-2">
                            <Button
                              size="sm"
                              onClick={handleHashtagConfirm}
                              className="w-full h-8 text-xs font-medium bg-primary hover:bg-primary/90 flex items-center gap-2"
                            >
                              <Check className="h-3 w-3" />
                              {language === "zh" ? "确认选择" : "Confirm Selection"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Script Selection */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="script-select"
                      className="text-base font-semibold text-foreground flex items-center gap-2"
                    >
                      <Database className="h-4 w-4 text-primary" />
                      {t("selectScriptLabel")}
                      {filteredScripts.length !==
                        (Array.isArray(availableScripts)
                          ? availableScripts.length
                          : 0) && (
                        <Badge variant="outline" className="text-xs">
                          {filteredScripts.length}/
                          {Array.isArray(availableScripts)
                            ? availableScripts.length
                            : 0}
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
                        <SelectValue
                          placeholder={
                            t("selectScriptPlaceholder") || "选择一个脚本"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {filteredScripts.length > 0 ? (
                          filteredScripts.map((script) => {
                            let displayName = script.name;
                            if (language === "zh" && script.cnName) {
                              displayName = script.cnName;
                            }
                            return (
                              <SelectItem
                                key={script.scriptId}
                                value={script.scriptId}
                                className="py-3"
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-primary/40" />
                                    <span className="font-medium">
                                      {displayName}
                                    </span>
                                  </div>
                                  {script.isScheduled && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/20"
                                    >
                                      {t("scheduledTask")}
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-muted-foreground text-sm">
                            {t("noMatchingScripts")}
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
                          {t("scriptDetails")}
                          {selectedScript.isScheduled && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/20 dark:text-blue-400"
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              {t("scheduledTask")}
                            </Badge>
                          )}
                        </h4>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <Book className="h-3.5 w-3.5" />
                              {t("description")}
                            </h5>
                            <p className="text-sm text-foreground leading-relaxed bg-muted/20 rounded-lg p-3">
                              {scriptDescription}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <Database className="h-3.5 w-3.5" />
                              {t("scope")}
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
                              {t("author")}
                            </h5>
                            <p className="text-sm text-foreground bg-muted/20 rounded-lg p-3">
                              {selectedScript.author || t("unknown")}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {t("createdAt")}
                            </h5>
                            <p className="text-sm text-foreground bg-muted/20 rounded-lg p-3">
                              {selectedScript.createdAt
                                ? formatDate(
                                    typeof selectedScript.createdAt === "string"
                                      ? selectedScript.createdAt
                                      : selectedScript.createdAt.toISOString(),
                                    language,
                                  )
                                : t("unknown")}
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
                          {t("runningCheck")}
                        </>
                      ) : (
                        <>
                          <Play className="mr-3 h-5 w-5 group-hover/btn:scale-110 transition-transform duration-200" />
                          {t("runCheck")}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* 批量执行筛选 */}
                  <div className="space-y-4">
                    {/* 脚本搜索 */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Search className="h-3.5 w-3.5" />
                        {t("searchScripts")}
                      </Label>
                      <div className="relative">
                        <Input
                          ref={searchInputRef}
                          placeholder={language === "zh" ? "搜索脚本名称或使用 #标签 筛选..." : "Search scripts or use #tag to filter..."}
                          value={searchTerm}
                          onChange={(e) => handleHashtagInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="h-10"
                        />
                        {/* Hashtag建议 */}
                        {showHashtagDropdown && availableHashtags.length > 0 && (
                          <div 
                            data-hashtag-dropdown
                            className="absolute top-full left-0 right-0 mt-1 bg-card border-2 border-border/30 rounded-lg shadow-lg z-50 max-h-48 overflow-hidden"
                          >
                            <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border/20 bg-muted/20 flex items-center justify-between">
                              <span>{language === "zh" ? "点击选择标签筛选脚本：" : "Click to filter scripts by tag:"}</span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground/80">
                                <CornerDownLeft className="h-3 w-3" />
                                <span>{language === "zh" ? "回车确认" : "Enter to confirm"}</span>
                              </div>
                            </div>
                            <div className="max-h-32 overflow-y-auto">
                              <div className="p-2 space-y-1">
                                {availableHashtags.map((tag) => (
                                  <button
                                    key={tag}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 rounded-md flex items-center gap-2 transition-all duration-200 group"
                                    onClick={() => handleHashtagSelect(tag)}
                                  >
                                    <Hash className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{tag}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="border-t border-border/20 p-2">
                              <Button
                                size="sm"
                                onClick={handleHashtagConfirm}
                                className="w-full h-8 text-xs font-medium bg-primary hover:bg-primary/90 flex items-center gap-2"
                              >
                                <Check className="h-3 w-3" />
                                {language === "zh" ? "确认选择" : "Confirm Selection"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 筛选结果统计 */}
                    {searchTerm.trim().length > 0 && (
                      <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/60 dark:border-blue-800/60 p-3">
                        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
                          <Database className="h-4 w-4" />
                          <span>
                            筛选结果: {filteredScripts.length} / {availableScripts.length} 个脚本
                          </span>
                          {searchTerm.includes('#') && (
                            <Badge variant="outline" className="text-xs ml-2">
                              包含标签搜索
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* 批量执行模式选择 */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Zap className="h-4 w-4 text-orange-500" />
                      {t("bulkExecution")}
                    </Label>
                    <div className="bg-gradient-to-r from-orange-50/50 to-yellow-50/50 dark:from-orange-950/20 dark:to-yellow-950/20 rounded-lg border border-orange-200/60 dark:border-orange-800/60 p-4">
                      <RadioGroup
                        value={bulkMode}
                        onValueChange={(value) =>
                          stableSetBulkMode(value as "all" | "scheduled")
                        }
                        className="space-y-3"
                      >
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem
                            value="all"
                            id="all"
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor="all"
                              className="text-sm font-medium cursor-pointer flex items-center gap-2"
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              {t("executeAllScriptsOption")}
                              <Badge variant="outline" className="text-xs">
                                {filteredScripts.length}
                              </Badge>
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("executeAllScriptsDesc")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem
                            value="scheduled"
                            id="scheduled"
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor="scheduled"
                              className="text-sm font-medium cursor-pointer flex items-center gap-2"
                            >
                              <Calendar className="h-4 w-4 text-blue-600" />
                              {t("executeScheduledScriptsOption")}
                              <Badge variant="outline" className="text-xs">
                                {filteredScripts.filter(script => script.isScheduled).length}
                              </Badge>
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("executeScheduledScriptsDesc")}
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
                      {t("scriptsExecutionProgress")}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted/20 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {getBatchScriptCount()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("scriptsToExecute")}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {Array.isArray(availableScripts)
                            ? availableScripts.filter(
                                (script) => script.isScheduled,
                              ).length
                            : 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("scheduledScripts")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Batch Execution Button */}
                  <div className="pt-2">
                    <AlertDialog
                      open={showBatchDialog}
                      onOpenChange={setShowBatchDialog}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          disabled={
                            isRunningBatch || getBatchScriptCount() === 0
                          }
                          size="lg"
                          className="w-full h-14 text-base font-semibold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transition-all duration-300 group/btn"
                        >
                          {isRunningBatch ? (
                            <>
                              <Loader2 className="animate-spin mr-3 h-5 w-5" />
                              {t("runningAllScripts")}
                            </>
                          ) : (
                            <>
                              <Zap className="mr-3 h-5 w-5 group-hover/btn:scale-110 transition-transform duration-200" />
                              {t("runAllScripts")} ({getBatchScriptCount()})
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                            {t("runAllScriptsConfirm")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("runAllScriptsConfirmDesc")}
                            <br />
                            <span className="font-medium">
                              {bulkMode === "scheduled"
                                ? t(
                                    "batchExecutionConfirmScheduledMessage",
                                  ).replace(
                                    "{count}",
                                    getBatchScriptCount().toString(),
                                  )
                                : t("batchExecutionConfirmMessage").replace(
                                    "{count}",
                                    getBatchScriptCount().toString(),
                                  )}
                            </span>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {t("cancelButton")}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleBatchExecution}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            {t("runAllScripts")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}

              {/* Status Message */}
              {triggerMessage && (
                <Alert
                  variant={
                    triggerMessageType === "error" ? "destructive" : "default"
                  }
                  className="mt-3 shadow-sm slide-in-right transition-all duration-300"
                >
                  <AlertTitle>
                    {triggerMessageType === "error"
                      ? t("triggerErrorTitle")
                      : t("triggerSuccessTitle")}
                  </AlertTitle>
                  <AlertDescription>{triggerMessage}</AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="text-center py-8 px-4 bg-card/50 rounded-lg border border-border/30 shadow-sm h-full flex flex-col justify-center">
              <div className="icon-container bg-muted/30 rounded-lg p-2 mx-auto mb-4">
                <Database className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="font-semibold text-base">
                {t("noScriptsAvailable")}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {t("ensureConfigured")}
              </p>
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
