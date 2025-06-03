"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  AlertTriangle,
  Save,
  Loader2,
  Home,
  FileText,
  History,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
} from "@/components/dashboard/types";
import { useLanguage } from "@/components/LanguageProvider";
import { formatDate } from "@/components/dashboard/utils";
import { containsHarmfulSql } from "@/lib/utils";
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

// Helper type for the form state, combining metadata and SQL content
type ManageScriptFormState = Partial<SqlScript>;

const ManageScriptsPage = () => {
  const router = useRouter();
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

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  const handleOpenDialog = (mode: "add" | "edit", scriptData?: SqlScript) => {
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
  };

  const handleMetadataChange = (
    fieldName: keyof ScriptFormData,
    value: string | boolean,
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
    if (
      !currentFormScript.scriptId ||
      !currentFormScript.name ||
      !currentFormScript.author ||
      !currentSqlContent
    ) {
      toast.error(t("fillRequiredFieldsError"));
      return;
    }
    if (containsHarmfulSql(currentSqlContent)) {
      toast.error(
        t(
          "SQL content rejected due to potentially harmful DDL/DML commands.",
        ) || "Harmful SQL detected!",
      );
      return;
    }

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
        throw new Error(
          errorData.message || `${t(errorMessageKey)}: ${response.status}`,
        );
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

  const filteredScripts = scripts.filter(
    (script) =>
      script.scriptId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (script.cnName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (script.author || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
                    <CardTitle className="text-xl font-bold text-foreground leading-relaxed">
                      {filteredScripts.length > 0
                        ? `${filteredScripts.length} ${t("scripts")}`
                        : t("manageScriptsPageTitle")}
                    </CardTitle>
                    <CardDescription className="text-base text-muted-foreground leading-relaxed">
                      {filteredScripts.length === 0 && !isLoading && !error
                        ? t("noScriptsYet")
                        : ""}
                    </CardDescription>
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
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-10 w-80 text-sm border-2 border-border/50 bg-background/80 backdrop-blur-sm focus:border-primary/50 shadow-sm transition-all duration-300"
                    />
                  </div>

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

                  {/* 刷新按钮 */}
                  <Button
                    onClick={fetchScripts}
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                    className="group shadow-sm hover:shadow-md transition-all duration-300"
                    title={t("refresh")}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 transition-transform ${isLoading ? "animate-spin" : "group-hover:rotate-45"}`}
                    />
                    {isLoading ? t("loading") : t("refresh")}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground space-x-3">
                  <Loader2 className="animate-spin h-6 w-6 text-primary" />
                  <span className="text-lg font-medium">{t("loading")}</span>
                </div>
              ) : error ? (
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
                  <Button
                    onClick={fetchScripts}
                    variant="outline"
                    className="mt-4"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("retry")}
                  </Button>
                </div>
              ) : filteredScripts.length === 0 ? (
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
                        {filteredScripts.map((script, index) => (
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
            </CardContent>
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

export default ManageScriptsPage;
