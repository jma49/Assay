"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  User,
  Calendar,
  Edit,
  Plus,
  Trash2,
  AlertCircle,
  RotateCcw,
  Search,
  FileText,
  Eye,
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
  dashboardTranslations,
  ITEMS_PER_PAGE,
} from "@/components/business/dashboard/types";
import { useLanguage } from "@/components/common/LanguageProvider";
import { cn } from "@/lib/utils/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { SkeletonTable } from "@/components/common/PageSkeletons";

export default function GlobalEditHistoryPage() {
  const { language } = useLanguage();
  const t = useCallback(
    (key: DashboardTranslationKeys | string): string => {
      const langTranslations =
        dashboardTranslations[language] || dashboardTranslations.en;
      return (langTranslations as Record<string, string>)[key] || key;
    },
    [language],
  );

  const [histories, setHistories] = useState<EditHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // 页面跳转相关状态
  const [pageInput, setPageInput] = useState("");

  // Filter states
  const [scriptNameFilter, setScriptNameFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [operationFilter, setOperationFilter] =
    useState<EditHistoryFilter["operation"]>("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  // Detail dialog state
  const [selectedHistory, setSelectedHistory] =
    useState<EditHistoryRecord | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // API调用去重：使用ref来跟踪是否正在调用
  const isFetchingRef = useRef(false);

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
      // 去重检查：如果已经在调用中，直接返回
      if (isFetchingRef.current) {
        console.log("fetchHistories: 已有请求在进行中，跳过重复调用");
        return;
      }

      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams();
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
            throw new Error("Unauthorized access");
          }
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch edit history");
        }

        const data = await response.json();
        setHistories(data.histories || []);
        setTotalPages(data.pagination?.totalPages || 0);
        setTotalRecords(data.pagination?.total || 0);
        setCurrentPage(data.pagination?.page || 1);
      } catch (err) {
        console.error("Failed to fetch edit history:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        setHistories([]);
        setTotalPages(0);
        setTotalRecords(0);
      } finally {
        setLoading(false);
        isFetchingRef.current = false; // 重置标志
      }
    },
    [],
  );

  useEffect(() => {
    fetchHistories();
  }, [fetchHistories]);

  const applyFilters = useCallback(() => {
    const filterParams = {
      scriptName: scriptNameFilter || undefined,
      author: authorFilter || undefined,
      operation: operationFilter,
      dateFrom: dateFromFilter ? new Date(dateFromFilter) : undefined,
      dateTo: dateToFilter ? new Date(dateToFilter) : undefined,
      page: 1,
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

  const resetFilters = useCallback(() => {
    setScriptNameFilter("");
    setAuthorFilter("");
    setOperationFilter("all");
    setDateFromFilter("");
    setDateToFilter("");
    fetchHistories({ page: 1 });
  }, [fetchHistories]);

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
        return "bg-success/10 text-success border-success/30   ";
      case "update":
        return "bg-muted text-foreground border-border   ";
      case "delete":
        return "bg-failure/10 text-failure border-failure/30   ";
      default:
        return "bg-muted text-foreground border-border   ";
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
    if (value === null || value === undefined) return t("noData");
    if (typeof value === "boolean") return value ? t("scheduled") : t("manual");
    if (typeof value === "string" && value.length > 50)
      return value.substring(0, 50) + "...";
    return String(value);
  };

  const formatPageInfo = () => {
    const start = Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalRecords);
    const end = Math.min(currentPage * ITEMS_PER_PAGE, totalRecords);
    if (totalRecords === 0) {
      return t("noResults");
    }
    return t("pageInfo")
      .replace("%s", String(start))
      .replace("%s", String(end))
      .replace("%s", String(totalRecords))
      .replace("%s", String(currentPage))
      .replace("%s", String(totalPages));
  };

  const handleViewDetails = (history: EditHistoryRecord) => {
    setSelectedHistory(history);
    setIsDetailDialogOpen(true);
  };

  const getChangesPreview = (changes: EditHistoryRecord["changes"]) => {
    if (!changes || changes.length === 0) return t("noChanges");
    if (changes.length === 1) {
      return changes[0].fieldDisplayNameCn || changes[0].fieldDisplayName;
    }
    return t("fieldChangesCount").replace("{count}", String(changes.length));
  };

  return (
    <div className="min-h-screen    ">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-6 animate-fadeIn">
          <div className="space-y-1">
            <p className="text-[13px] text-muted-foreground">
              <Link href="/manage-scripts" className="hover:text-foreground">
                {language === "zh" ? "脚本" : "Scripts"}
              </Link>{" "}
              / {t("allScriptsHistory")}
            </p>
            <PageHeader
              title={t("allScriptsHistory")}
              description={
                <>
                  {t("editHistoryDescGlobal")} · {t("totalChanges")}:{" "}
                  <span className="text-foreground tabular-nums">{totalRecords}</span>
                </>
              }
            />
          </div>

          {/* Filters Section */}
          <Card className="relative overflow-hidden gap-0 py-0">

            <CardHeader className="relative border-b px-6 py-4">
              <div className="flex items-center gap-4">
                <CardTitle>
                  {t("searchHistoryWithFilters")}
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="relative p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Script Name Filter */}
                <div className="space-y-2">
                  <Label
                    htmlFor="script-name-filter"
                    className="flex items-center gap-2 text-[13px] font-medium"
                  >
                    {t("scriptName")}
                  </Label>
                  <Input
                    id="script-name-filter"
                    type="text"
                    placeholder={t("searchScriptsPlaceholder")}
                    value={scriptNameFilter}
                    onChange={(e) => setScriptNameFilter(e.target.value)}
                    className="h-9 w-full"
                  />
                </div>

                {/* Author Filter */}
                <div className="space-y-2">
                  <Label
                    htmlFor="author-filter"
                    className="flex items-center gap-2 text-[13px] font-medium"
                  >
                    {t("author")}
                  </Label>
                  <Input
                    id="author-filter"
                    type="text"
                    placeholder={t("author")}
                    value={authorFilter}
                    onChange={(e) => setAuthorFilter(e.target.value)}
                    className="h-9 w-full"
                  />
                </div>

                {/* Operation Type Filter */}
                <div className="space-y-2">
                  <Label
                    htmlFor="operation-filter"
                    className="flex items-center gap-2 text-[13px] font-medium"
                  >
                    {t("operationType")}
                  </Label>
                  <Select
                    value={operationFilter}
                    onValueChange={(value) =>
                      setOperationFilter(
                        value as EditHistoryFilter["operation"],
                      )
                    }
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue
                        placeholder={t("selectOperationPlaceholder")}
                      />
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

                {/* Date From Filter */}
                <div className="space-y-2">
                  <Label
                    htmlFor="date-from-filter"
                    className="flex items-center gap-2 text-[13px] font-medium"
                  >
                    {t("dateFrom")}
                  </Label>
                  <Input
                    id="date-from-filter"
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    className="h-9 w-full"
                  />
                </div>

                {/* Date To Filter */}
                <div className="space-y-2">
                  <Label
                    htmlFor="date-to-filter"
                    className="flex items-center gap-2 text-[13px] font-medium"
                  >
                    {t("dateTo")}
                  </Label>
                  <Input
                    id="date-to-filter"
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    className="h-9 w-full"
                  />
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={applyFilters}
                  size="default"
                  className="group flex items-center gap-2 transition-all duration-300"
                  disabled={loading}
                >
                  <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  {t("searchEditHistory")}
                </Button>
                <Button
                  onClick={resetFilters}
                  variant="outline"
                  size="default"
                  className="group flex items-center gap-2 transition-all duration-300"
                  disabled={loading}
                >
                  <RotateCcw className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                  {t("resetFilters")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* History Records Table */}
          <Card className="relative overflow-hidden gap-0 py-0">

            <CardHeader className="relative border-b px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <CardTitle>
                    Edit History
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {totalPages > 1 ? formatPageInfo() : totalRecords > 0 ? language === "zh" ? `共 ${totalRecords} 条` : `${totalRecords} records` : ""}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative p-0">
              {loading ? (
                <SkeletonTable rows={6} withTitle={false} className="rounded-none border-0" />
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="p-6 rounded-lg border border-failure/30 max-w-md mx-auto text-center">
                    <AlertCircle className="h-12 w-12 text-failure mx-auto mb-4" />
                    <p className="text-lg font-medium text-failure mb-2">
                      {t("errorTitle")}
                    </p>
                    <p className="text-sm text-failure mb-4">
                      {error}
                    </p>
                    <Button
                      onClick={() => fetchHistories()}
                      variant="outline"
                      size="sm"
                      className="transition-all duration-300"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {t("retry")}
                    </Button>
                  </div>
                </div>
              ) : histories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="p-6 rounded-lg border border-dashed border-muted-foreground/20 max-w-md mx-auto text-center">
                    <History className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground mb-2">
                      {t("noEditHistory")}
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      {t("noEditHistoryDetail")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border/20    ">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="h-11 px-6 text-[13px] font-normal text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {t("operationType")}
                            </div>
                          </TableHead>
                          <TableHead className="h-11 px-4 text-[13px] font-normal text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {t("scriptName")}
                            </div>
                          </TableHead>
                          <TableHead className="h-11 px-4 text-[13px] font-normal text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {t("operationUser")}
                            </div>
                          </TableHead>
                          <TableHead className="h-11 px-4 text-[13px] font-normal text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {t("operationTime")}
                            </div>
                          </TableHead>
                          <TableHead className="h-11 px-4 text-[13px] font-normal text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {t("fieldChanges")}
                            </div>
                          </TableHead>
                          <TableHead className="h-11 px-6 text-right text-[13px] font-normal text-muted-foreground">
                            <div className="flex items-center justify-end gap-2">
                              {t("tableActions")}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border/20">
                        {histories.map((history, index) => (
                          <TableRow
                            key={history._id?.toString() || index}
                            className={cn(
                              "group/row transition-all duration-200    ",
                              index % 2 === 0 ? "bg-background" : "bg-muted/5",
                            )}
                          >
                            <TableCell className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                {getOperationIcon(history.operation)}
                                <Badge
                                  variant="outline"
                                  className={`${getOperationBadgeColor(history.operation)} font-medium px-2 py-1 text-xs`}
                                >
                                  {getOperationText(history.operation)}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell
                              className="px-4 py-3 font-medium max-w-56 leading-relaxed"
                              title={
                                history.scriptSnapshot?.name ||
                                history.scriptSnapshot?.scriptId
                              }
                            >
                              <div className="space-y-1">
                                <div className="truncate font-semibold group-hover/row:text-primary transition-colors duration-200">
                                  {history.scriptSnapshot?.name ||
                                    history.scriptSnapshot?.scriptId ||
                                    t("unknownScript")}
                                </div>
                                {history.scriptSnapshot?.cnName && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {history.scriptSnapshot.cnName}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell
                              className="px-4 py-3 text-muted-foreground max-w-32 leading-relaxed"
                              title={history.userName || history.userEmail}
                            >
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3" />
                                <span className="truncate text-sm">
                                  {history.userName ||
                                    history.userEmail ||
                                    history.scriptSnapshot?.author ||
                                    t("unknownUser")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-40 px-4 py-3 text-[13px] text-muted-foreground tabular-nums">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                <span className="truncate">
                                  {formatDate(
                                    typeof history.operationTime === "string"
                                      ? history.operationTime
                                      : history.operationTime.toISOString(),
                                    language,
                                  )}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-muted-foreground max-w-48 leading-relaxed">
                              <div className="truncate text-sm">
                                {getChangesPreview(history.changes)}
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(history)}
                                className="-mr-2 size-8 p-0 text-muted-foreground hover:text-foreground"
                                title={t("checkDetails")}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>

            {/* Pagination - 在Card内部添加CardFooter，与CheckHistory组件保持一致 */}
            {totalPages > 1 && !loading && histories.length > 0 && (
              <CardFooter className="flex flex-col sm:flex-row items-center justify-between border-t px-5 py-3 text-xs gap-2 relative z-10">
                <div className="text-muted-foreground text-center sm:text-left">
                  {formatPageInfo()}
                </div>
                <div className="flex items-center gap-2 relative z-20">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1 || loading}
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
                          onClick={() => handlePageChange(1)}
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
                          onClick={() => handlePageChange(totalPages)}
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
                    onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages || loading}
                    className="h-7 px-2 text-xs transition-all duration-150 relative z-30"
                  >
                    <span className="hidden sm:inline">{t("next")}</span>
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              {t("editHistoryDetails")}
            </DialogTitle>
            <DialogDescription>
              {selectedHistory && (
                <span>
                  {getOperationText(selectedHistory.operation)} •{" "}
                  {selectedHistory.scriptSnapshot?.name ||
                    selectedHistory.scriptSnapshot?.scriptId}{" "}
                  •{" "}
                  {formatDate(
                    typeof selectedHistory.operationTime === "string"
                      ? selectedHistory.operationTime
                      : selectedHistory.operationTime.toISOString(),
                    language,
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedHistory && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("operationType")}
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {getOperationIcon(selectedHistory.operation)}
                    <Badge
                      variant="outline"
                      className={getOperationBadgeColor(
                        selectedHistory.operation,
                      )}
                    >
                      {getOperationText(selectedHistory.operation)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("operationUser")}
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-4 h-4" />
                    <span
                      className="text-sm truncate"
                      title={
                        selectedHistory.userName ||
                        selectedHistory.userEmail ||
                        t("unknownUser")
                      }
                    >
                      {selectedHistory.userName ||
                        selectedHistory.userEmail ||
                        t("unknownUser")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Script Info */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t("scriptDetails")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-muted-foreground">
                      {t("scriptName")}
                    </label>
                    <p className="font-medium">
                      {selectedHistory.scriptSnapshot?.name || t("unknown")}
                    </p>
                  </div>
                  <div>
                    <label className="text-muted-foreground">
                      {t("scriptNameCn")}
                    </label>
                    <p className="font-medium">
                      {selectedHistory.scriptSnapshot?.cnName || t("unknown")}
                    </p>
                  </div>
                  <div>
                    <label className="text-muted-foreground">
                      {t("fieldScriptId")}
                    </label>
                    <p className="font-mono text-xs">
                      {selectedHistory.scriptSnapshot?.scriptId || t("unknown")}
                    </p>
                  </div>
                  <div>
                    <label className="text-muted-foreground">
                      {t("author")}
                    </label>
                    <p className="font-medium">
                      {selectedHistory.scriptSnapshot?.author || t("unknown")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Changes Details */}
              {selectedHistory.changes &&
                selectedHistory.changes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      {t("changesDetails")} ({selectedHistory.changes.length})
                    </h4>
                    <div className="space-y-4">
                      {selectedHistory.changes.map((change, index) => (
                        <div
                          key={index}
                          className="border border-border/30 rounded-lg p-4 bg-background/50"
                        >
                          <div className="font-medium mb-3 text-sm">
                            {change.fieldDisplayNameCn ||
                              change.fieldDisplayName}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-muted-foreground font-medium">
                                {t("originalValue")}
                              </label>
                              <div className="mt-1 p-3 bg-failure/10 border border-failure/30 rounded text-failure font-mono text-xs break-all whitespace-pre-wrap max-h-32 overflow-y-auto">
                                {formatValue(change.oldValue)}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground font-medium">
                                {t("newValue")}
                              </label>
                              <div className="mt-1 p-3 bg-success/10 border border-success/30 rounded text-success font-mono text-xs break-all whitespace-pre-wrap max-h-32 overflow-y-auto">
                                {formatValue(change.newValue)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Description */}
              {(selectedHistory.descriptionCn ||
                selectedHistory.description) && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">{t("description")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedHistory.descriptionCn ||
                      selectedHistory.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Version Display - Fixed Bottom Left */}
      <div className="fixed left-6 bottom-6 z-50">
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/40 transition-all duration-300">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span className="font-mono text-xs text-muted-foreground font-medium">
            v{process.env.NEXT_PUBLIC_APP_VERSION || "0.1.7"}
          </span>
        </div>
      </div>
    </div>
  );
}
