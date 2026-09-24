"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  User,
  Calendar,
  Edit,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Filter,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { formatDate } from "@/components/business/dashboard/utils";
import {
  EditHistoryRecord,
  EditHistoryFilter,
} from "@/lib/workflows/edit-history-schema";
import { 
  DashboardTranslationKeys,
  ITEMS_PER_PAGE 
} from "@/components/business/dashboard/types";

interface GlobalEditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: (key: DashboardTranslationKeys | string) => string;
}

export function GlobalEditHistoryDialog({
  open,
  onOpenChange,
  t,
}: GlobalEditHistoryDialogProps) {
  const [histories, setHistories] = useState<EditHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageInput, setPageInput] = useState("");

  // UI筛选器状态
  const [scriptNameFilter, setScriptNameFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [operationFilter, setOperationFilter] =
    useState<EditHistoryFilter["operation"]>("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  // 防止重复请求的标志
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchHistories = useCallback(
    async (
      params: {
        scriptName?: string;
        author?: string;
        operation?: EditHistoryFilter["operation"];
        dateFrom?: Date;
        dateTo?: Date;
        page?: number;
        limit?: number;
      } = {},
    ) => {
      setLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams();

        // 构建查询参数
        if (params.scriptName?.trim())
          searchParams.set("scriptName", params.scriptName.trim());
        if (params.author?.trim())
          searchParams.set("author", params.author.trim());
        if (params.operation && params.operation !== "all")
          searchParams.set("operation", params.operation);
        if (params.dateFrom)
          searchParams.set("dateFrom", params.dateFrom.toISOString());
        if (params.dateTo)
          searchParams.set("dateTo", params.dateTo.toISOString());
        searchParams.set("page", String(params.page || 1));
        searchParams.set("limit", String(ITEMS_PER_PAGE)); // 使用ITEMS_PER_PAGE常量
        searchParams.set("sortBy", "operationTime");
        searchParams.set("sortOrder", "desc");

        const response = await fetch(`/api/edit-history?${searchParams}`);
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("需要登录");
          }
          const errorData = await response.json();
          throw new Error(errorData.error || "获取编辑历史失败");
        }

        const data = await response.json();
        setHistories(data.histories || []);
        setTotalPages(data.pagination?.totalPages || 0);
        // 如果后端返回的总数超过我们的限制，显示限制数
        const actualTotal = data.pagination?.total || 0;
        setTotalRecords(actualTotal);
        setCurrentPage(data.pagination?.page || 1);
      } catch (err) {
        console.error("Failed to fetch edit history:", err);
        const errorMessage =
          err instanceof Error ? err.message : "获取编辑历史时发生未知错误";
        setError(errorMessage);
        setHistories([]);
        setTotalPages(0);
        setTotalRecords(0);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // 初始化数据加载
  useEffect(() => {
    if (open && !isInitialized) {
      setIsInitialized(true);
      fetchHistories();
    }

    // 当对话框关闭时重置状态
    if (!open) {
      setIsInitialized(false);
      setHistories([]);
      setError(null);
      setCurrentPage(1);
      setTotalPages(0);
      setTotalRecords(0);
      setPageInput("");
    }
  }, [open, isInitialized, fetchHistories]);

  // 应用筛选器
  const applyFilters = useCallback(() => {
    const filterParams = {
      scriptName: scriptNameFilter || undefined,
      author: authorFilter || undefined,
      operation: operationFilter,
      dateFrom: dateFromFilter ? new Date(dateFromFilter) : undefined,
      dateTo: dateToFilter ? new Date(dateToFilter) : undefined,
      page: 1, // 重置到第一页
    };
    fetchHistories(filterParams);
  }, [
    scriptNameFilter,
    authorFilter,
    operationFilter,
    dateFromFilter,
    dateToFilter,
    fetchHistories,
  ]);

  // 重置筛选器
  const resetFilters = useCallback(() => {
    setScriptNameFilter("");
    setAuthorFilter("");
    setOperationFilter("all");
    setDateFromFilter("");
    setDateToFilter("");
    fetchHistories({ page: 1 });
  }, [fetchHistories]);

  // 页面导航
  const handlePageChange = useCallback(
    (page: number) => {
      const filterParams = {
        scriptName: scriptNameFilter || undefined,
        author: authorFilter || undefined,
        operation: operationFilter,
        dateFrom: dateFromFilter ? new Date(dateFromFilter) : undefined,
        dateTo: dateToFilter ? new Date(dateToFilter) : undefined,
        page,
      };
      fetchHistories(filterParams);
    },
    [
      scriptNameFilter,
      authorFilter,
      operationFilter,
      dateFromFilter,
      dateToFilter,
      fetchHistories,
    ],
  );

  // 页面跳转相关函数
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page);
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

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case "create":
        return <Plus className="w-4 h-4 text-success" />;
      case "update":
        return <Edit className="w-4 h-4 text-muted-foreground" />;
      case "delete":
        return <Trash2 className="w-4 h-4 text-failure" />;
      default:
        return <History className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getOperationBadgeColor = (operation: string) => {
    switch (operation) {
      case "create":
        return "bg-success/10 text-success border-success/30";
      case "update":
        return "bg-muted text-foreground border-border";
      case "delete":
        return "bg-failure/10 text-failure border-failure/30";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  const getOperationText = (operation: string) => {
    switch (operation) {
      case "create":
        return t("operationCreate");
      case "update":
        return t("operationUpdate");
      case "delete":
        return t("operationDelete");
      default:
        return operation;
    }
  };

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined) {
      return t("noData");
    }
    if (typeof value === "boolean") {
      return value ? t("scheduled") : t("manual");
    }
    if (typeof value === "string" && value.length > 100) {
      return value.substring(0, 100) + "...";
    }
    return String(value);
  };

  const formatPageInfo = () => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, totalRecords);
    return t("pageInfo")
      .replace("%s", String(start))
      .replace("%s", String(end))
      .replace("%s", String(totalRecords))
      .replace("%s", String(currentPage))
      .replace("%s", String(totalPages));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-6">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <History className="w-6 h-6 text-muted-foreground" />
            {t("allScriptsHistory")}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mt-2">
            {t("editHistoryDescGlobal")} - {t("totalChanges")}: {totalRecords}
            {totalRecords >= 500 && ` (每页显示${ITEMS_PER_PAGE}条记录)`}
          </DialogDescription>
        </DialogHeader>

        {/* 筛选器区域 */}
        <Card className="border border-border flex-shrink-0 mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <Filter className="w-4 h-4" />
              {t("searchHistoryWithFilters")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="script-name-filter"
                  className="text-sm font-medium text-foreground"
                >
                  {t("scriptName")}
                </Label>
                <Input
                  id="script-name-filter"
                  type="text"
                  placeholder={t("searchScriptsPlaceholder")}
                  value={scriptNameFilter}
                  onChange={(e) => setScriptNameFilter(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="author-filter"
                  className="text-sm font-medium text-foreground"
                >
                  {t("author")}
                </Label>
                <Input
                  id="author-filter"
                  type="text"
                  placeholder={t("author")}
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="operation-filter"
                  className="text-sm font-medium text-foreground"
                >
                  {t("operationType")}
                </Label>
                <Select
                  value={operationFilter}
                  onValueChange={(value) =>
                    setOperationFilter(value as EditHistoryFilter["operation"])
                  }
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("operationAll")}</SelectItem>
                    <SelectItem value="create">
                      {t("operationCreate")}
                    </SelectItem>
                    <SelectItem value="update">
                      {t("operationUpdate")}
                    </SelectItem>
                    <SelectItem value="delete">
                      {t("operationDelete")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="date-from-filter"
                  className="text-sm font-medium text-foreground"
                >
                  {t("dateFrom")}
                </Label>
                <Input
                  id="date-from-filter"
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="date-to-filter"
                  className="text-sm font-medium text-foreground"
                >
                  {t("dateTo")}
                </Label>
                <Input
                  id="date-to-filter"
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={applyFilters}
                size="default"
                className="flex items-center gap-2"
                disabled={loading}
              >
                <Search className="w-4 h-4" />
                {t("searchEditHistory")}
              </Button>
              <Button
                onClick={resetFilters}
                variant="outline"
                size="default"
                className="flex items-center gap-2"
                disabled={loading}
              >
                <RotateCcw className="w-4 h-4" />
                {t("resetFilters")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 历史记录列表 */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin mr-3 text-muted-foreground" />
                <span className="text-lg text-muted-foreground">
                  {t("loadingEditHistory")}
                </span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-failure">
                <AlertCircle className="w-8 h-8 mb-3" />
                <span className="text-lg font-medium">{error}</span>
                <Button
                  onClick={() => fetchHistories()}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  {t("retry")}
                </Button>
              </div>
            ) : histories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <History className="w-8 h-8 mb-3" />
                <span className="text-lg">{t("noEditHistory")}</span>
                <span className="text-sm mt-2">
                  尝试调整筛选条件或创建一些脚本操作
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {histories.map((history, index) => (
                  <Card
                    key={history._id?.toString() || index}
                    className="relative border border-border "
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="mt-1">
                            {getOperationIcon(history.operation)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`${getOperationBadgeColor(history.operation)} font-medium px-3 py-1`}
                              >
                                {getOperationText(history.operation)}
                              </Badge>
                              <span className="font-semibold text-base text-foreground truncate">
                                {history.scriptSnapshot?.name ||
                                  history.scriptSnapshot?.scriptId ||
                                  "Unknown Script"}
                              </span>
                              {history.scriptSnapshot?.cnName && (
                                <span className="text-sm text-muted-foreground truncate">
                                  ({history.scriptSnapshot.cnName})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>
                                  {history.userName ||
                                    history.userEmail ||
                                    history.scriptSnapshot?.author ||
                                    "Unknown"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {formatDate(
                                    typeof history.operationTime === "string"
                                      ? history.operationTime
                                      : history.operationTime.toISOString(),
                                  )}
                                </span>
                              </div>
                              {history.changes &&
                                history.changes.length > 0 && (
                                  <span className="text-foreground font-medium">
                                    {history.changes.length} 项更改
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    {history.changes && history.changes.length > 0 && (
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-foreground">
                            {t("changesDetails")}：
                          </h4>
                          <div className="space-y-3 max-h-48 overflow-y-auto">
                            {history.changes.map((change, changeIndex) => (
                              <div
                                key={changeIndex}
                                className="bg-muted rounded-lg p-4 border border-border"
                              >
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-sm font-medium text-foreground">
                                    {change.fieldDisplayNameCn ||
                                      change.fieldDisplayName}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground font-medium">
                                      {t("originalValue")}：
                                    </span>
                                    <div className="mt-2 p-3 bg-failure/10 border border-failure/30 rounded text-failure font-mono text-sm">
                                      {formatValue(change.oldValue)}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground font-medium">
                                      {t("newValue")}：
                                    </span>
                                    <div className="mt-2 p-3 bg-success/10 border border-success/30 rounded text-success font-mono text-sm">
                                      {formatValue(change.newValue)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    )}

                    {(history.descriptionCn || history.description) && (
                      <CardContent className="pt-0">
                        <div className="text-sm text-foreground bg-muted rounded p-3">
                          <span className="font-medium">
                            {t("description")}：
                          </span>
                          {history.descriptionCn || history.description}
                        </div>
                      </CardContent>
                    )}

                    {index < histories.length - 1 && (
                      <Separator className="mt-6" />
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* 分页 - 和CheckHistory组件风格一致 */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-border flex-shrink-0 text-sm gap-2">
            <div className="text-muted-foreground text-center sm:text-left">
              {formatPageInfo()}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1 || loading}
                className="h-7 px-2 text-xs transition-all duration-150"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">{t("previous")}</span>
              </Button>

              <div className="flex items-center gap-1.5 px-2">
                <div className="hidden md:flex items-center gap-1">
                  {currentPage > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePageChange(1)}
                      className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
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
                      onClick={() => handlePageChange(totalPages)}
                      className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
                      title={t("jumpToLast")}
                    >
                      {totalPages}
                    </Button>
                  )}
                </div>

                {totalPages > 5 && (
                  <div className="hidden lg:flex items-center gap-1 ml-2">
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
                        className="w-12 h-6 px-1 text-xs text-center border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
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
                        className="h-6 px-2 text-xs"
                        title={t("pageJump")}
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
                  handlePageChange(Math.min(currentPage + 1, totalPages))
                }
                disabled={currentPage === totalPages || loading}
                className="h-7 px-2 text-xs transition-all duration-150"
              >
                <span className="hidden sm:inline">{t("next")}</span>
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
