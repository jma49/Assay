"use client";

import React, { useEffect, useState, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PlusCircle,
  Edit,
  Trash2,

  Search,
  AlertTriangle,
  Save,
  Loader2,
  Home,
  FileText,
  History,
  Activity,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  SqlScript, // ScriptInfo removed, using SqlScript for list too for consistency
  DashboardTranslationKeys,
  dashboardTranslations,
  ITEMS_PER_PAGE,
} from "@/components/dashboard/types";
import { useLanguage } from "@/components/LanguageProvider";
import { formatDate } from "@/components/dashboard/utils";
import { isReadOnlyQuery } from "@/lib/utils";
import {
  ScriptMetadataForm,
  ScriptFormData,
} from "@/components/scripts/ScriptMetadataForm";
import CodeMirrorEditor from "@/components/scripts/CodeMirrorEditor";
import { generateSqlTemplateWithTranslation } from "@/components/dashboard/scriptTranslations";
import { cn } from "@/lib/utils";
import { EditHistoryDialog } from "@/components/scripts/EditHistoryDialog";
import { recordEditHistory } from "@/lib/edit-history";
import UserHeader from "@/components/UserHeader";
import { CompactHashtagFilter } from "@/components/ui/compact-hashtag-filter";
import { StackedTags } from "@/components/ui/stacked-tags";
import { LoadingOverlay } from "@/components/ui/loading";

// Helper type for the form state, combining metadata and SQL content
type ManageScriptFormState = Partial<SqlScript>;

const ManageScriptsContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scripts, setScripts] = useState<SqlScript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");

  // Hashtag筛选相关状态
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);

  // API调用去重：使用ref来跟踪是否正在调用
  const isFetchingRef = useRef(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [currentFormScript, setCurrentFormScript] =
    useState<ManageScriptFormState>({});
  const [currentSqlContent, setCurrentSqlContent] = useState<string>("");
  const [initialSqlContentForEdit, setInitialSqlContentForEdit] =
    useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scriptIdManuallyEdited, setScriptIdManuallyEdited] = useState(false);

  const [scriptToDelete, setScriptToDelete] = useState<SqlScript | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  // 编辑历史相关状态
  const [isEditHistoryOpen, setIsEditHistoryOpen] = useState(false);
  const [selectedScriptForHistory, setSelectedScriptForHistory] =
    useState<string>("");
  const [originalScriptData, setOriginalScriptData] =
    useState<SqlScript | null>(null);

  const { language } = useLanguage();
  const t = useCallback(
    (key: DashboardTranslationKeys | string): string => {
      const langTranslations =
        dashboardTranslations[language] || dashboardTranslations.en;
      return (langTranslations as Record<string, string>)[key] || key;
    },
    [language],
  );

  const fetchScripts = useCallback(async () => {
    // 去重检查：如果已经在调用中，直接返回
    if (isFetchingRef.current) {
      console.log("fetchScripts: 已有请求在进行中，跳过重复调用");
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/scripts");
      if (!response.ok) {
        throw new Error(`Failed to fetch scripts: ${response.status}`);
      }
      const scriptsData: SqlScript[] = await response.json();
      setScripts(
        scriptsData.map((s) => ({
          ...s,
          createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
        })),
      );
    } catch (err) {
      console.error("Failed to fetch scripts:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false; // 重置标志
    }
  }, []); // 移除所有依赖，确保只在组件首次加载时调用

  const handleOpenDialog = useCallback((mode: "add" | "edit", scriptData?: SqlScript) => {
    setDialogMode(mode);
    if (mode === "add") {
      const newScriptId = `new-script-${Date.now().toString().slice(-6)}`;
      const templateSql = generateSqlTemplateWithTranslation(
        newScriptId,
        "",
        "",
        "",
        "",
      );
      setCurrentFormScript({
        scriptId: newScriptId,
        name: "",
        cnName: "",
        description: "",
        cnDescription: "",
        scope: "",
        cnScope: "",
        author: "",
        hashtags: [],
        isScheduled: false,
        cronSchedule: "",
      });
      setCurrentSqlContent(templateSql);
      setInitialSqlContentForEdit(templateSql);
      setScriptIdManuallyEdited(false);
      setOriginalScriptData(null);
    } else if (scriptData) {
      setCurrentFormScript({
        ...scriptData,
        isScheduled:
          typeof scriptData.isScheduled === "boolean"
            ? scriptData.isScheduled
            : false,
        cronSchedule: scriptData.cronSchedule || "",
      });
      setCurrentSqlContent(scriptData.sqlContent || "");
      setInitialSqlContentForEdit(scriptData.sqlContent || "");
      setScriptIdManuallyEdited(true);
      setOriginalScriptData(scriptData);
    }
    setIsDialogOpen(true);
  }, []);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  // 处理URL参数中的scriptId，自动打开编辑对话框
  useEffect(() => {
    const scriptIdFromUrl = searchParams.get('scriptId');
    if (scriptIdFromUrl && scripts.length > 0 && !isDialogOpen) {
      const targetScript = scripts.find(script => script.scriptId === scriptIdFromUrl);
      if (targetScript) {
        handleOpenDialog('edit', targetScript);
        // 清除URL参数，避免重复触发
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('scriptId');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, [scripts, searchParams, isDialogOpen, handleOpenDialog]);

  const handleMetadataChange = (
    fieldName: keyof ScriptFormData,
    value: string | boolean | string[],
  ) => {
    setCurrentFormScript((prev: ManageScriptFormState) => ({
      ...prev,
      [fieldName]: value,
    }));
    if (fieldName === "scriptId") {
      setScriptIdManuallyEdited(true);
    }
    if (
      dialogMode === "add" &&
      fieldName === "name" &&
      !scriptIdManuallyEdited &&
      typeof value === "string" &&
      value
    ) {
      const suggestedId = value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      setCurrentFormScript((prev: ManageScriptFormState) => ({
        ...prev,
        scriptId: suggestedId,
      }));
    }
  };

  const handleDialogSave = async () => {
    // 详细的字段验证，提供具体的错误信息
    const missingFields = [];
    if (!currentFormScript.scriptId?.trim()) missingFields.push("脚本ID");
    if (!currentFormScript.name?.trim()) missingFields.push("脚本名称");
    if (!currentFormScript.author?.trim()) missingFields.push("作者");
    if (!currentSqlContent?.trim()) missingFields.push("SQL内容");

    if (missingFields.length > 0) {
      toast.error("请填写必填字段", {
        description: `缺少字段：${missingFields.join("、")}`,
        duration: 6000,
      });
      return;
    }
    
    // 严格的安全检查 - 只允许查询操作
    const securityCheck = isReadOnlyQuery(currentSqlContent);
    if (!securityCheck.isValid) {
      toast.error("SQL内容安全检查失败", {
        description: `${securityCheck.reason}\n\n系统允许查询操作（SELECT、WITH、EXPLAIN）和安全的PL/pgSQL块（DO），禁止数据修改和结构变更操作。`,
        duration: 10000,
        action: {
          label: "查看安全规则",
          onClick: () => {
            toast.info("SQL安全规则", {
              description: "✅ 允许：SELECT、WITH、EXPLAIN查询、DO块（仅包含查询和日志）\n❌ 禁止：INSERT、UPDATE、DELETE、CREATE、ALTER、DROP等操作",
              duration: 8000,
            });
          },
        },
      });
      return;
    }

    // 添加调试日志
    console.log("🚀 开始保存脚本", {
      mode: dialogMode,
      scriptId: currentFormScript.scriptId,
      name: currentFormScript.name,
      author: currentFormScript.author,
      sqlContentLength: currentSqlContent.length,
      sqlPreview: currentSqlContent.substring(0, 100) + "...",
    });

    setIsSubmitting(true);
    const currentPayload: Partial<SqlScript> = {
      ...currentFormScript,
      sqlContent: currentSqlContent,
    };

    let response;
    let successMessage = "";
    let errorMessageKey: DashboardTranslationKeys | string = "";

    try {
      if (dialogMode === "add") {
        if (!currentPayload.scriptId?.trim()) {
          toast.error(t("invalidScriptIdError"));
          setIsSubmitting(false);
          return;
        }
        response = await fetch("/api/scripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentPayload),
        });
        successMessage = t("scriptSavedSuccess");
        errorMessageKey = "scriptSaveError";
      } else {
        const updatePayload: Partial<SqlScript> = {
          name: currentPayload.name,
          cnName: currentPayload.cnName,
          description: currentPayload.description,
          cnDescription: currentPayload.cnDescription,
          scope: currentPayload.scope,
          cnScope: currentPayload.cnScope,
          author: currentPayload.author,
          hashtags: currentPayload.hashtags,
          isScheduled: currentPayload.isScheduled,
          cronSchedule: currentPayload.cronSchedule,
        };

        if (currentSqlContent !== initialSqlContentForEdit) {
          updatePayload.sqlContent = currentSqlContent;
        }

        Object.keys(updatePayload).forEach((key) => {
          const typedKey = key as keyof typeof updatePayload;
          if (updatePayload[typedKey] === undefined) {
            delete updatePayload[typedKey];
          }
        });

        response = await fetch(`/api/scripts/${currentFormScript.scriptId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });
        successMessage = t("scriptUpdatedSuccess");
        errorMessageKey = "scriptUpdateError";
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: t(errorMessageKey) }));
        
        // 检查是否是需要审批的情况
        if (errorData.requiresApproval) {
          toast.success("申请已提交", {
            description: errorData.message,
            duration: 6000,
          });
          setIsDialogOpen(false);
          return; // 不需要重新加载，因为没有实际修改脚本
        }
        
        throw new Error(
          errorData.message || `Failed to ${dialogMode} script: ${response.status}`,
        );
      }

      const responseData = await response.json();
      
      // 检查响应中是否有审批相关信息
      if (responseData.requiresApproval) {
        toast.success("申请已提交", {
          description: responseData.message,
          duration: 6000,
        });
        setIsDialogOpen(false);
        return; // 不需要重新加载和记录历史
      }

      // 记录编辑历史
      if (currentFormScript.scriptId) {
        await recordEditHistory({
          scriptId: currentFormScript.scriptId,
          operation: dialogMode === "add" ? "create" : "update",
          oldData: originalScriptData
            ? (originalScriptData as unknown as Record<string, unknown>)
            : undefined,
          newData: {
            ...currentFormScript,
            sqlContent: currentSqlContent,
          } as unknown as Record<string, unknown>,
        });
      }

      toast.success(successMessage);
      setIsDialogOpen(false);
      fetchScripts();
    } catch (err) {
      console.error(`Failed to ${dialogMode} script:`, err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error(t(errorMessageKey) || `Failed to ${dialogMode} script`, {
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (script: SqlScript) => {
    setScriptToDelete(script);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!scriptToDelete) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/scripts/${scriptToDelete.scriptId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: t("scriptDeleteError") }));
        throw new Error(
          errorData.message || `Failed to delete script: ${response.status}`,
        );
      }

      const responseData = await response.json();
      
      // 检查是否需要审批
      if (responseData.requiresApproval) {
        toast.success("删除申请已提交", {
          description: responseData.message,
          duration: 6000,
        });
        setIsAlertOpen(false);
        setScriptToDelete(null);
        return; // 不需要重新加载，因为脚本还没有被实际删除
      }

      // 如果是直接删除成功（不太可能，因为现在都需要审批）
      // 记录删除历史
      await recordEditHistory({
        scriptId: scriptToDelete.scriptId,
        operation: "delete",
        oldData: scriptToDelete as unknown as Record<string, unknown>,
        // newData is not needed for delete
      });

      toast.success(t("scriptDeletedSuccess"));
      fetchScripts();
    } catch (err) {
      console.error("Failed to delete script:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error(t("scriptDeleteError"), { description: errorMsg });
    } finally {
      setIsSubmitting(false);
      setIsAlertOpen(false);
      setScriptToDelete(null);
    }
  };

  // 处理查看编辑历史
  const handleViewEditHistory = (scriptId: string) => {
    setSelectedScriptForHistory(scriptId);
    setIsEditHistoryOpen(true);
  };

  // 跳转到主页的执行历史并过滤特定脚本
  const handleViewExecutionHistory = (scriptId: string) => {
    // 将脚本ID存储到sessionStorage，以便主页读取
    sessionStorage.setItem("filter-script-id", scriptId);
    // 跳转到主页
    router.push("/#execution-history");
  };

  const filteredScripts = scripts.filter((script) => {
    // 文本搜索筛选
    const matchesSearch = 
      script.scriptId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (script.cnName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (script.author || "").toLowerCase().includes(searchTerm.toLowerCase());

    // Hashtag筛选
    const matchesHashtags = selectedHashtags.length === 0 || 
      (script.hashtags && selectedHashtags.every(tag => script.hashtags?.includes(tag)));

    return matchesSearch && matchesHashtags;
  });

  // 分页逻辑
  const totalScripts = filteredScripts.length;
  const totalPages = Math.ceil(totalScripts / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedScripts = filteredScripts.slice(startIndex, endIndex);

  // 获取所有可用的hashtag
  const availableHashtags = Array.from(
    new Set(scripts.flatMap(script => script.hashtags || []))
  ).sort();

  // 页面跳转相关函数
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput(""); // 清空输入框
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handlePageInputSubmit(e);
    }
    // 限制只能输入数字
    if (
      !/[\d\b]/.test(e.key) &&
      !["ArrowLeft", "ArrowRight", "Delete", "Backspace", "Tab"].includes(e.key)
    ) {
      e.preventDefault();
    }
  };

  // 搜索时重置到第一页
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Hashtag筛选变化时重置到第一页
  const handleHashtagFilterChange = (hashtags: string[]) => {
    setSelectedHashtags(hashtags);
    setCurrentPage(1);
  };

  // 格式化分页信息
  const formatPageInfo = () => {
    const start = startIndex + 1;
    const end = Math.min(endIndex, totalScripts);
    return t("pageInfo")
      .replace("%s", String(start))
      .replace("%s", String(end))
      .replace("%s", String(totalScripts))
      .replace("%s", String(currentPage))
      .replace("%s", String(totalPages));
  };

  const dialogTitle =
    dialogMode === "add"
      ? t("addScriptDialogTitle")
      : t("editScriptDialogTitle");

  const formMetadata: ScriptFormData = {
    scriptId: currentFormScript.scriptId || "",
    name: currentFormScript.name || "",
    cnName: currentFormScript.cnName || "",
    description: currentFormScript.description || "",
    cnDescription: currentFormScript.cnDescription || "",
    author: currentFormScript.author || "",
    scope: currentFormScript.scope || "",
    cnScope: currentFormScript.cnScope || "",
    hashtags: currentFormScript.hashtags || [],
    isScheduled:
      typeof currentFormScript.isScheduled === "boolean"
        ? currentFormScript.isScheduled
        : false,
    cronSchedule: currentFormScript.cronSchedule || "",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <UserHeader />
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-8 animate-fadeIn">
          {/* Header Section */}
          <header className="text-center lg:text-left">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-3">
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent leading-tight py-1">
                  {t("manageScriptsPageTitle")}
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t("manageScriptsPageDescription")}
                </p>
              </div>
            </div>
          </header>

          {/* Scripts Table */}
          <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
            {/* 装饰性背景 */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />

            <CardHeader className="relative px-6 py-5 border-b border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20 group-hover:ring-primary/30 transition-all duration-300">
                    <FileText className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-bold text-foreground leading-relaxed">
                      {totalScripts > 0
                        ? `${totalScripts} ${t("scripts")}`
                        : t("manageScriptsPageTitle")}
                    </CardTitle>
                  </div>
                </div>

                {/* 搜索和操作按钮区域 */}
                <div className="flex items-center gap-3">
                  {/* 搜索框 */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      placeholder={t("searchPlaceholder")}
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-9 pr-10 h-10 w-80 text-sm border-2 border-border/50 bg-background/80 backdrop-blur-sm focus:border-primary/50 shadow-sm transition-all duration-300"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-all duration-200"
                        onClick={() => handleSearchChange("")}
                      >
                        <span className="sr-only">{t("clearSearch")}</span>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Hashtag筛选器 */}
                  {availableHashtags.length > 0 && (
                    <CompactHashtagFilter
                      availableHashtags={availableHashtags}
                      selectedHashtags={selectedHashtags}
                      onHashtagsChange={handleHashtagFilterChange}
                      className="h-10"
                    />
                  )}

                  {/* 编辑历史按钮 */}
                  <Link href="/manage-scripts/edit-history">
                    <Button
                      variant="outline"
                      className="h-10 flex items-center gap-2 text-purple-700 border-purple-300 hover:bg-purple-50 hover:text-purple-600 dark:text-purple-400 dark:border-purple-600 dark:hover:bg-purple-900/30 dark:hover:text-purple-300"
                    >
                      <History className="h-4 w-4" />
                      {t("allScriptsHistory")}
                    </Button>
                  </Link>


                </div>
              </div>
            </CardHeader>

            <CardContent className="relative p-0">
              <LoadingOverlay isLoading={isLoading} text={t("loading")} spinnerSize="lg">
                {error ? (
                <div className="p-6 text-center space-y-4">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border-2 border-dashed border-muted-foreground/20 max-w-md mx-auto">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground">
                      {t("errorTitle")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {error}
                    </p>
                  </div>

                </div>
              ) : totalScripts === 0 ? (
                <div className="p-8 text-center space-y-4">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border-2 border-dashed border-muted-foreground/20 max-w-md mx-auto">
                    <PlusCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">
                      {t("noScriptsYet")}
                    </p>
                    <p className="text-sm text-muted-foreground/70 mt-2">
                      {t("manageScriptsPageDescription")}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleOpenDialog("add")}
                    className="mt-4"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t("addNewScriptButton")}
                  </Button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border/20 shadow-inner bg-gradient-to-b from-background to-muted/10">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 border-b-2 border-primary/20 backdrop-blur-sm">
                          <TableHead className="h-16 px-4 font-bold text-foreground/90 border-r border-border/10 last:border-r-0 leading-relaxed">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-400/60"></div>
                              {t("fieldScriptId")}
                            </div>
                          </TableHead>
                          <TableHead className="h-16 px-4 font-bold text-foreground/90 border-r border-border/10 last:border-r-0 leading-relaxed">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-400/60"></div>
                              {t("fieldScriptNameEn")}
                            </div>
                          </TableHead>
                          <TableHead className="h-16 px-4 font-bold text-foreground/90 border-r border-border/10 last:border-r-0 leading-relaxed">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-amber-400/60"></div>
                              {t("fieldScriptAuthor")}
                            </div>
                          </TableHead>
                          <TableHead className="h-16 px-4 font-bold text-foreground/90 border-r border-border/10 last:border-r-0 leading-relaxed">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-teal-400/60"></div>
                              {t("hashtags") || "标签"}
                            </div>
                          </TableHead>
                          <TableHead className="h-16 px-4 font-bold text-foreground/90 border-r border-border/10 last:border-r-0 leading-relaxed">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-purple-400/60"></div>
                              {t("fieldCreatedAt")}
                            </div>
                          </TableHead>
                          <TableHead className="h-16 px-4 font-bold text-foreground/90 text-center leading-relaxed">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-pink-400/60"></div>
                              {t("tableActions")}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border/20">
                        {paginatedScripts.map((script, index) => (
                          <TableRow
                            key={script._id || script.scriptId}
                            className={cn(
                              "group/row transition-all duration-200 hover:bg-gradient-to-r hover:from-muted/30 hover:to-muted/10 hover:shadow-sm",
                              index % 2 === 0 ? "bg-background" : "bg-muted/5",
                            )}
                          >
                            <TableCell
                              className="px-4 py-5 font-semibold max-w-48 group-hover/row:text-primary transition-colors duration-200 leading-relaxed"
                              title={script.scriptId}
                            >
                              <div className="truncate">{script.scriptId}</div>
                            </TableCell>
                            <TableCell
                              className="px-4 py-5 font-medium max-w-56 leading-relaxed"
                              title={script.name}
                            >
                              <div className="truncate">{script.name}</div>
                            </TableCell>
                            <TableCell
                              className="px-4 py-5 text-muted-foreground max-w-32 leading-relaxed"
                              title={script.author}
                            >
                              <div className="truncate">{script.author}</div>
                            </TableCell>
                            <TableCell
                              className="px-4 py-5 max-w-48 leading-relaxed"
                              title={script.hashtags?.join(", ") || ""}
                            >
                              <StackedTags tags={script.hashtags || []} visibleCount={1} />
                            </TableCell>
                            <TableCell className="px-4 py-5 text-muted-foreground max-w-40 font-mono text-sm leading-relaxed">
                              <div className="truncate">
                                {script.createdAt
                                  ? formatDate(
                                      script.createdAt instanceof Date
                                        ? script.createdAt.toISOString()
                                        : script.createdAt.toString(),
                                      language,
                                    )
                                  : t("unknown")}
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-5 text-center">
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenDialog("edit", script)
                                  }
                                  className="h-8 px-3 text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-md hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-950/20 dark:hover:border-blue-700/50 dark:hover:text-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                                  title={t("editScriptTitle")}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleViewEditHistory(script.scriptId)
                                  }
                                  className="h-8 px-3 text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-md hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-950/20 dark:hover:border-purple-700/50 dark:hover:text-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800"
                                  title={t("viewEditHistory")}
                                >
                                  <History className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleViewExecutionHistory(script.scriptId)
                                  }
                                  className="h-8 px-3 text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-md hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 dark:hover:bg-orange-950/20 dark:hover:border-orange-700/50 dark:hover:text-orange-400 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800"
                                  title={t("viewExecutionHistory")}
                                >
                                  <Activity className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteClick(script)}
                                  className="h-8 px-3 text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-md hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-950/20 dark:hover:border-red-700/50 dark:hover:text-red-400 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800"
                                  title={t("deleteScriptButton")}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
                </LoadingOverlay>
            </CardContent>

            {/* 分页 - 和CheckHistory组件风格一致 */}
            {totalPages > 1 && (
              <CardFooter className="flex flex-col sm:flex-row items-center justify-between border-t px-5 py-3 text-xs gap-2 relative z-10">
                <div className="text-muted-foreground text-center sm:text-left">
                  {formatPageInfo()}
                </div>
                <div className="flex items-center gap-2 relative z-20">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-7 px-2 text-xs shadow-sm hover:shadow transition-all duration-150 relative z-30"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline">{t("previous")}</span>
                  </Button>

                  <div className="flex items-center gap-1.5 px-2 relative z-30">
                    <div className="hidden md:flex items-center gap-1">
                      {currentPage > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground relative z-40"
                          title={t("jumpToFirst")}
                        >
                          1
                        </Button>
                      )}
                      {currentPage > 3 && (
                        <span className="text-muted-foreground">...</span>
                      )}
                    </div>

                    <span className="text-muted-foreground text-xs">
                      {t("pageNumber")}
                    </span>
                    <span className="font-medium text-xs min-w-[1.5rem] text-center">
                      {currentPage}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {t("of")} {totalPages} {t("pages")}
                    </span>

                    <div className="hidden md:flex items-center gap-1">
                      {currentPage < totalPages - 2 && (
                        <span className="text-muted-foreground">...</span>
                      )}
                      {currentPage < totalPages && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground relative z-40"
                          title={t("jumpToLast")}
                        >
                          {totalPages}
                        </Button>
                      )}
                    </div>

                    {totalPages > 2 && (
                      <div className="hidden lg:flex items-center gap-1 ml-2 relative z-40">
                        <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                        <form
                          onSubmit={handlePageInputSubmit}
                          className="flex items-center gap-1"
                        >
                          <input
                            type="number"
                            min="1"
                            max={totalPages}
                            value={pageInput}
                            onChange={handlePageInputChange}
                            onKeyDown={handlePageInputKeyDown}
                            placeholder={t("jumpToPage")}
                            className="w-12 h-6 px-1 text-xs text-center border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring relative z-50"
                            style={{ pointerEvents: "auto" }}
                          />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            disabled={
                              !pageInput ||
                              isNaN(parseInt(pageInput, 10)) ||
                              parseInt(pageInput, 10) < 1 ||
                              parseInt(pageInput, 10) > totalPages
                            }
                            className="h-6 px-2 text-xs relative z-50"
                            title={t("pageJump")}
                            style={{ pointerEvents: "auto" }}
                          >
                            {t("pageJump")}
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(Math.min(currentPage + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="h-7 px-2 text-xs shadow-sm hover:shadow transition-all duration-150 relative z-30"
                  >
                    <span className="hidden sm:inline">{t("next")}</span>
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>

          {/* Action Buttons - Bottom Right */}
          <div className="flex justify-end">
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => handleOpenDialog("add")}
                size="lg"
                className="group shadow-md hover:shadow-lg transition-all duration-300"
              >
                <PlusCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                {t("addNewScriptButton")}
              </Button>
              <Link href="/">
                <Button
                  variant="outline"
                  size="lg"
                  className="group shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <Home className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  {t("backToDashboardButton")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[70vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {dialogMode === "add"
                ? t("scriptMetadataDesc")
                : t("editScriptTitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-2 space-y-4 py-2">
            <ScriptMetadataForm
              formData={formMetadata}
              onFormChange={handleMetadataChange}
              t={t}
              isEditMode={dialogMode === "edit"}
            />
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("fieldSqlContent")}{" "}
                <span className="text-destructive">*</span>
              </label>
              <CodeMirrorEditor
                value={currentSqlContent}
                onChange={setCurrentSqlContent}
                minHeight="250px"
                t={t}
              />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            {/* 验证状态提示 */}
            <div className="flex-1 text-sm text-muted-foreground">
              {(() => {
                const missingFields = [];
                if (!currentFormScript.scriptId?.trim()) missingFields.push("脚本ID");
                if (!currentFormScript.name?.trim()) missingFields.push("名称");
                if (!currentFormScript.author?.trim()) missingFields.push("作者");
                if (!currentSqlContent?.trim()) missingFields.push("SQL内容");
                
                if (missingFields.length > 0) {
                  return (
                    <div className="flex items-center gap-1 text-orange-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>缺少必填字段：{missingFields.join("、")}</span>
                    </div>
                  );
                }
                
                const securityCheck = isReadOnlyQuery(currentSqlContent);
                if (!securityCheck.isValid) {
                  return (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>SQL安全检查失败：{securityCheck.reason}</span>
                    </div>
                  );
                }
                
                return (
                  <div className="flex items-center gap-1 text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>验证通过，可以保存</span>
                  </div>
                );
              })()}
            </div>
            
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  {t("cancelButton")}
                </Button>
              </DialogClose>
              <Button
                type="button"
                onClick={handleDialogSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-0 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-0 h-4 w-4" />
                )}
                {t("saveScriptButton")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDeleteScriptTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteScriptMessage").replace(
                "{scriptName}",
                String(scriptToDelete?.name || scriptToDelete?.scriptId || ""),
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setScriptToDelete(null)}>
              {t("cancelButton")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSubmitting && (
                <Loader2 className="mr-0 h-4 w-4 animate-spin" />
              )}
              {t("deleteButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 版本号显示 - 固定在左下角 */}
      <div className="fixed left-6 bottom-6 z-50">
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-mono text-xs text-muted-foreground font-medium">
            v{process.env.NEXT_PUBLIC_APP_VERSION || "0.1.7"}
          </span>
        </div>
      </div>

      {/* 编辑历史对话框 */}
      {isEditHistoryOpen && selectedScriptForHistory && (
        <EditHistoryDialog
          open={isEditHistoryOpen}
          onOpenChange={setIsEditHistoryOpen}
          scriptId={selectedScriptForHistory}
          t={t}
        />
      )}
    </div>
  );
};

const ManageScriptsPage = () => {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <ManageScriptsContent />
    </Suspense>
  );
};

export default ManageScriptsPage;
