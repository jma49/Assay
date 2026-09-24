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
} from "@/components/business/dashboard/types";
import { useLanguage } from "@/components/common/LanguageProvider";
import { formatDate } from "@/components/business/dashboard/utils";
import { sqlValidationMessage, validateReadOnlySql } from "@/lib/sql/read-only-validator";
import {
  ScriptMetadataForm,
  ScriptFormData,
} from "@/components/business/scripts/ScriptMetadataForm";
import dynamic from "next/dynamic";

// CodeMirror and its themes are large; load them only where the editor renders.
const CodeMirrorEditor = dynamic(
  () => import("@/components/business/scripts/CodeMirrorEditor"),
  { ssr: false, loading: () => <div className="h-[480px] animate-pulse rounded-lg border bg-muted/40" /> },
);
import { generateSqlTemplateWithTranslation } from "@/components/business/dashboard/scriptTranslations";
import { EditHistoryDialog } from "@/components/business/scripts/EditHistoryDialog";
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
      toast.error(language === "zh" ? "请填写必填字段" : "Fill in the required fields", {
        description: language === "zh" ? `缺少字段：${missingFields.join("、")}` : `Missing: ${missingFields.join(", ")}`,
        duration: 6000,
      });
      return;
    }
    
    // 严格的安全检查 - 只允许查询操作
    const securityCheck = validateReadOnlySql(currentSqlContent);
    if (!securityCheck.isValid) {
      toast.error(language === "zh" ? "查询未通过只读检查" : "The query failed the read-only check", {
        description: sqlValidationMessage(securityCheck, language),
        duration: 10000,
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
          toast.success(language === "zh" ? "申请已提交" : "Submitted for approval", {
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
        toast.success(language === "zh" ? "申请已提交" : "Submitted for approval", {
          description: responseData.message,
          duration: 6000,
        });
        setIsDialogOpen(false);
        return; // 不需要重新加载和记录历史
      }

      // Edit history is recorded by the API route.

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
        toast.success(language === "zh" ? "删除申请已提交" : "Deletion submitted for approval", {
          description: responseData.message,
          duration: 6000,
        });
        setIsAlertOpen(false);
        setScriptToDelete(null);
        return; // 不需要重新加载，因为脚本还没有被实际删除
      }

      // Edit history is recorded by the API route.

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
    console.log("🔍 打开编辑历史弹窗:", scriptId);
    
    if (!scriptId || scriptId.trim() === "") {
      console.error("❌ 无效的scriptId:", scriptId);
      toast.error(language === "zh" ? "无效的脚本ID" : "Invalid script ID");
      return;
    }
    
    setSelectedScriptForHistory(scriptId);
    setIsEditHistoryOpen(true);
    
    // 添加调试信息
    toast.info(language === "zh" ? "正在加载编辑历史" : "Loading edit history", {
      description: language === "zh" ? `脚本ID: ${scriptId}` : `Script ID: ${scriptId}`,
      duration: 2000,
    });
  };

  // 跳转到主页的执行历史并过滤特定脚本
  const handleViewExecutionHistory = (scriptId: string) => {
    console.log("🔍 [管理页面] 跳转到执行历史并搜索脚本:", scriptId);
    
    if (!scriptId || scriptId.trim() === "") {
      console.error("❌ [管理页面] 无效的scriptId:", scriptId);
      toast.error(language === "zh" ? "无效的脚本ID" : "Invalid script ID");
      return;
    }
    
    const trimmedScriptId = scriptId.trim();
    
    // 显示跳转提示
    toast.info(language === "zh" ? "正在跳转到执行历史" : "Opening run history", {
      description: language === "zh" ? `将搜索脚本: ${trimmedScriptId}` : `Filtering by ${trimmedScriptId}`,
      duration: 2000,
    });
    
    // 直接跳转到主页并通过URL参数传递搜索条件
    console.log("🚀 [管理页面] 跳转到主页并传递搜索参数:", trimmedScriptId);
    router.push(`/?search=${encodeURIComponent(trimmedScriptId)}#execution-history`);
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
    <div className="min-h-screen    ">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-8 animate-fadeIn">
          {/* Header Section */}
          <header className="">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <h1 className="text-[28px] leading-tight font-semibold">
                  {t("manageScriptsPageTitle")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("manageScriptsPageDescription")}
                </p>
              </div>
            </div>
          </header>

          {/* Scripts Table */}
          <Card className="relative gap-0 overflow-hidden py-0">
            <CardHeader className="relative border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <CardTitle>
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
                      className="pl-9 pr-10 h-10 w-80 text-sm border border-border/50 bg-background/80 backdrop-blur-sm focus:border-primary/50 transition-all duration-300"
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
                      className="h-10 flex items-center gap-2 text-foreground border-border hover:bg-muted hover:text-muted-foreground    "
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
                  <div className="p-6 rounded-lg border border-dashed border-muted-foreground/20 max-w-md mx-auto">
                    <AlertTriangle className="h-12 w-12 text-failure mx-auto mb-4" />
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
                  <div className="p-6 rounded-lg border border-dashed border-muted-foreground/20 max-w-md mx-auto">
                    <PlusCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">
                      {t("noScriptsYet")}
                    </p>
                    <p className="text-sm text-muted-foreground/70 mt-2">
                      {t("manageScriptsPageDescription")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table className="table-fixed">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="h-11 w-[22%] px-6 text-[13px] font-normal text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {t("fieldScriptId")}
                            </div>
                          </TableHead>
                          <TableHead className="h-11 w-[24%] px-4 text-[13px] font-normal text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {t("fieldScriptNameEn")}
                            </div>
                          </TableHead>
                          <TableHead className="h-11 w-[12%] px-4 text-[13px] font-normal text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {t("fieldScriptAuthor")}
                            </div>
                          </TableHead>
                          <TableHead className="h-11 w-[14%] px-4 text-[13px] font-normal text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {t("hashtags") || "标签"}
                            </div>
                          </TableHead>
                          <TableHead className="h-11 w-[16%] px-4 text-[13px] font-normal text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {t("fieldCreatedAt")}
                            </div>
                          </TableHead>
                          <TableHead className="h-11 w-44 px-6 text-right text-[13px] font-normal text-muted-foreground">
                            <div className="flex items-center justify-end gap-2">
                              {t("tableActions")}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedScripts.map((script) => (
                          <TableRow
                            key={script._id || script.scriptId}
                            className="group/row"
                          >
                            <TableCell
                              className="max-w-48 px-6 py-3 font-medium"
                              title={script.scriptId}
                            >
                              <div className="truncate">{script.scriptId}</div>
                            </TableCell>
                            <TableCell
                              className="px-4 py-3 font-medium max-w-56"
                              title={script.name}
                            >
                              <div className="truncate">{script.name}</div>
                            </TableCell>
                            <TableCell
                              className="px-4 py-3 text-muted-foreground max-w-32"
                              title={script.author}
                            >
                              <div className="truncate">{script.author}</div>
                            </TableCell>
                            <TableCell
                              className="px-4 py-3 max-w-48"
                              title={script.hashtags?.join(", ") || ""}
                            >
                              <StackedTags tags={script.hashtags || []} visibleCount={1} />
                            </TableCell>
                            <TableCell className="max-w-40 px-4 py-3 text-[13px] text-muted-foreground tabular-nums">
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
                            <TableCell className="px-6 py-3 text-right">
                              <div className="-mr-2 flex justify-end gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleOpenDialog("edit", script)
                                  }
                                  className="size-8 text-muted-foreground hover:text-foreground"
                                  title={t("editScriptTitle")}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleViewEditHistory(script.scriptId)
                                  }
                                  className="size-8 text-muted-foreground hover:text-foreground"
                                  title={t("viewEditHistory")}
                                >
                                  <History className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleViewExecutionHistory(script.scriptId)
                                  }
                                  className="size-8 text-muted-foreground hover:text-foreground"
                                  title={t("viewExecutionHistory")}
                                >
                                  <Activity className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClick(script)}
                                  className="size-8 text-muted-foreground hover:bg-failure/10 hover:text-failure"
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
                    className="h-7 px-2 text-xs transition-all duration-150 relative z-30"
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
                    className="h-7 px-2 text-xs transition-all duration-150 relative z-30"
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
              {/* 表单创建按钮 */}
              <Link href="/scripts/new">
                <Button
                  size="lg"
                  className="group transition-all duration-300"
                >
                  <PlusCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  {t("createScriptButton")}
                </Button>
              </Link>
              
              {/* 快速创建按钮 */}
              <Button
                onClick={() => handleOpenDialog("add")}
                variant="outline"
                size="lg"
                className="group transition-all duration-300"
              >
                <PlusCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                {t("quickCreateButton")}
              </Button>
              
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="lg"
                  className="group transition-all duration-300"
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
            {/* The editor's status bar already reports the read-only check. */}
            <div className="flex-1 text-[13px]">
              {(() => {
                const zh = language === "zh";
                const missing = [
                  !currentFormScript.name?.trim() && (zh ? "名称" : "name"),
                  !currentFormScript.scriptId?.trim() && (zh ? "脚本 ID" : "script ID"),
                  !currentSqlContent?.trim() && (zh ? "查询" : "query"),
                ].filter(Boolean);
                return missing.length > 0 ? (
                  <span className="text-attention">
                    {zh ? `还需填写：${missing.join("、")}` : `Still needed: ${missing.join(", ")}`}
                  </span>
                ) : null;
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
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/40 transition-all duration-300">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
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
