"use client";

import React, { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { ScriptsFinder } from "@/components/business/scripts/ScriptsFinder";
import { WindowStatusBar, WindowToolbar } from "@/components/layout/WindowChrome";
import { PageHeader } from "@/components/layout/PageHeader";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {

  Search,
  AlertTriangle,
  Save,
  Loader2,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
} from "@/components/business/dashboard/types";
import { useLanguage } from "@/components/common/LanguageProvider";
import { sqlValidationMessage, validateReadOnlySql } from "@/lib/sql/read-only-validator";
import { scheduleProblem } from "@/lib/scheduling/schedule";
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
import { SkeletonTable } from "@/components/common/PageSkeletons";

// Helper type for the form state, combining metadata and SQL content
type ManageScriptFormState = Partial<SqlScript>;

const ManageScriptsContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scripts, setScripts] = useState<SqlScript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
    
    const badSchedule = scheduleProblem(currentFormScript.isScheduled, currentFormScript.cronSchedule, language);
    if (badSchedule) {
      toast.error(badSchedule);
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
    router.push(`/dashboard?search=${encodeURIComponent(trimmedScriptId)}#execution-history`);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
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
        <div className="space-y-4 animate-fadeIn">
          {/* Header Section */}
          <WindowStatusBar>
            {language === "zh"
              ? `${scripts.length} 个检查 · ${scripts.filter((script) => script.isScheduled).length} 个定时执行`
              : `${scripts.length} checks · ${scripts.filter((script) => script.isScheduled).length} scheduled`}
          </WindowStatusBar>
          <PageHeader
            title={t("manageScriptsPageTitle")}
            description={t("manageScriptsPageDescription")}
          />

          <WindowToolbar>
            <div className="relative w-64 max-sm:w-full">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label={t("searchPlaceholder")}
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-7 rounded-full pl-8 text-[13px]"
              />
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/manage-scripts/edit-history">
                <History />
                {t("allScriptsHistory")}
              </Link>
            </Button>
            <Button asChild size="sm" className="ml-auto">
              <Link href="/scripts/new">{language === "zh" ? "新建检查" : "New Check"}</Link>
            </Button>
          </WindowToolbar>

          {isLoading && scripts.length === 0 ? (
            <SkeletonTable rows={8} withTitle={false} />
          ) : error ? (
            <div className="aqua-window rounded-[7px] p-8 text-center">
              <AlertTriangle className="mx-auto mb-3 size-10 text-failure" />
              <p className="font-medium">{t("errorTitle")}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">{error}</p>
            </div>
          ) : (
            <ScriptsFinder
              scripts={scripts}
              searchTerm={searchTerm}
              language={language}
              onEdit={(script) => handleOpenDialog("edit", script)}
              onEditHistory={handleViewEditHistory}
              onRunHistory={handleViewExecutionHistory}
              onDelete={handleDeleteClick}
            />
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[70vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {dialogMode === "add" ? (
                t("scriptMetadataDesc")
              ) : (
                <span className="font-mono">{formMetadata.scriptId}</span>
              )}
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
