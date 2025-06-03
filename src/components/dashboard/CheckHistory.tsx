import React, { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Database,
  ExternalLink,
  Filter,
  Search,
  X,
  MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Check, DashboardTranslationKeys } from "./types";
import { formatDate } from "./utils";

interface CheckHistoryProps {
  paginatedChecks: Check[];
  allChecksCount: number;
  totalUnfilteredCount: number;
  totalPages: number;
  currentPage: number;
  filterStatus: string | null;
  searchTerm: string;
  sortConfig: {
    key: keyof Check | "";
    direction: "ascending" | "descending";
  };
  successCount: number;
  failureCount: number;
  needsAttentionCount: number;
  language: string;
  t: (key: DashboardTranslationKeys) => string;
  setFilterStatus: (status: string | null) => void;
  setSearchTerm: (term: string) => void;
  setCurrentPage: (page: number) => void;
  requestSort: (key: keyof Check) => void;
  startIndex: number;
  endIndex: number;
}

export const CheckHistory: React.FC<CheckHistoryProps> = ({
  paginatedChecks,
  allChecksCount,
  totalUnfilteredCount,
  totalPages,
  currentPage,
  filterStatus,
  searchTerm,
  sortConfig,
  successCount,
  failureCount,
  needsAttentionCount,
  language,
  t,
  setFilterStatus,
  setSearchTerm,
  setCurrentPage,
  requestSort,
  startIndex,
  endIndex,
}) => {
  const [pageInput, setPageInput] = useState("");

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

  return (
    <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
      {/* 装饰性背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />

      <CardHeader className="relative px-6 py-5 border-b border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
          <div className="space-y-2">
            <CardTitle className="text-xl font-bold flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20 group-hover:ring-primary/30 transition-all duration-300">
                <Clock className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <span className="text-gradient">{t("historyTitle")}</span>
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {t("historyDesc").replace("%s", String(totalUnfilteredCount))} ·{" "}
              {t("viewAndManageAllRecords")}
            </CardDescription>
          </div>

          <div className="w-full sm:w-auto space-y-4">
            {/* 第一行：All筛选器和搜索栏 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterStatus(null);
                  setCurrentPage(1);
                  // 点击All时设置按执行时间降序排序（最新的在前）
                  requestSort("execution_time");
                }}
                className={cn(
                  "h-11 px-4 gap-2 text-sm transition-all duration-300 shadow-md hover:shadow-lg group/filter flex-1 sm:flex-initial sm:min-w-[120px]",
                  filterStatus === null &&
                    "ring-2 ring-primary/50 ring-offset-2 ring-offset-background border-primary/30 shadow-lg shadow-primary/10",
                )}
              >
                <Filter
                  size={14}
                  className="group-hover/filter:rotate-12 transition-transform duration-200"
                />
                {t("filterAll")}
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-5 text-xs px-2 bg-primary/10 text-primary border-primary/20"
                >
                  {totalUnfilteredCount}
                </Badge>
              </Button>

              {/* 搜索栏 */}
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 text-sm rounded-lg border-2 border-border/50 bg-background/80 backdrop-blur-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-offset-2 focus:border-primary/50 shadow-md transition-all duration-300 placeholder:text-muted-foreground/60"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-all duration-200"
                    onClick={() => setSearchTerm("")}
                  >
                    <span className="sr-only">{t("clearSearch")}</span>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* 第二行：Success、Attention、Failure筛选器 */}
            <div className="flex items-center gap-3 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterStatus("success");
                  setCurrentPage(1);
                  // 确保按时间降序排序
                  requestSort("execution_time");
                }}
                className={cn(
                  "h-11 px-4 gap-2 text-sm transition-all duration-300 shadow-md hover:shadow-lg group/filter flex-1 min-w-0",
                  filterStatus === "success" &&
                    "ring-2 ring-green-500/50 ring-offset-2 ring-offset-background border-green-500/30 shadow-lg shadow-green-500/10",
                )}
              >
                <CheckCircle
                  size={14}
                  className="group-hover/filter:scale-110 transition-transform duration-200"
                />
                <span className="truncate">{t("filterSuccess")}</span>
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-5 text-xs px-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                >
                  {successCount}
                </Badge>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterStatus("attention_needed");
                  setCurrentPage(1);
                  // 确保按时间降序排序
                  requestSort("execution_time");
                }}
                className={cn(
                  "h-11 px-4 gap-2 text-sm transition-all duration-300 shadow-md hover:shadow-lg group/filter flex-1 min-w-0",
                  filterStatus === "attention_needed" &&
                    "ring-2 ring-amber-500/50 ring-offset-2 ring-offset-background border-amber-500/30 shadow-lg shadow-amber-500/10",
                )}
              >
                <AlertCircle
                  size={14}
                  className="group-hover/filter:scale-110 transition-transform duration-200"
                />
                <span className="truncate">{t("needsAttention")}</span>
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-5 text-xs px-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                >
                  {needsAttentionCount}
                </Badge>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterStatus("failure");
                  setCurrentPage(1);
                  // 确保按时间降序排序
                  requestSort("execution_time");
                }}
                className={cn(
                  "h-11 px-4 gap-2 text-sm transition-all duration-300 shadow-md hover:shadow-lg group/filter flex-1 min-w-0",
                  filterStatus === "failure" &&
                    "ring-2 ring-red-500/50 ring-offset-2 ring-offset-background border-red-500/30 shadow-lg shadow-red-500/10",
                )}
              >
                <AlertCircle
                  size={14}
                  className="group-hover/filter:scale-110 transition-transform duration-200"
                />
                <span className="truncate">{t("filterFailed")}</span>
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-5 text-xs px-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
                >
                  {failureCount}
                </Badge>
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative p-0">
        <div className="overflow-hidden rounded-lg border border-border/20 shadow-inner bg-gradient-to-b from-background to-muted/10">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 border-b-2 border-primary/20 backdrop-blur-sm">
                  <TableHead className="h-16 px-4 font-bold text-foreground/90 w-36 text-center border-r border-border/10 last:border-r-0">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                      {t("tableStatus")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-primary/10 transition-all duration-300 px-4 font-bold text-foreground/90 group/sort w-64 border-r border-border/10 last:border-r-0"
                    onClick={() => requestSort("script_name")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-400/60"></div>
                      {t("tableScriptName")}
                      <div className="flex flex-col items-center">
                        {sortConfig.key === "script_name" && (
                          <span className="text-primary">
                            {sortConfig.direction === "ascending" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </span>
                        )}
                        <ChevronUp className="h-3 w-3 opacity-20 group-hover/sort:opacity-50 transition-all duration-300" />
                      </div>
                    </div>
                  </TableHead>
                  <TableHead
                    className="hidden lg:table-cell cursor-pointer hover:bg-primary/10 transition-all duration-300 px-4 font-bold text-foreground/90 group/sort w-52 border-r border-border/10 last:border-r-0"
                    onClick={() => requestSort("execution_time")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400/60"></div>
                      {t("tableExecutionTime")}
                      <div className="flex flex-col items-center">
                        {sortConfig.key === "execution_time" && (
                          <span className="text-primary">
                            {sortConfig.direction === "ascending" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </span>
                        )}
                        <ChevronUp className="h-3 w-3 opacity-20 group-hover/sort:opacity-50 transition-all duration-300" />
                      </div>
                    </div>
                  </TableHead>
                  <TableHead className="hidden md:table-cell px-4 font-bold text-foreground/90 border-r border-border/10 last:border-r-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400/60"></div>
                      {t("tableFindings")}
                    </div>
                  </TableHead>
                  <TableHead className="text-center px-4 font-bold text-foreground/90 w-44">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-400/60"></div>
                      {t("tableActions")}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/20">
                {paginatedChecks.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-48 text-center bg-gradient-to-b from-muted/20 to-muted/5"
                    >
                      <div className="flex flex-col items-center justify-center space-y-6">
                        <div className="relative">
                          <div className="p-8 rounded-3xl bg-gradient-to-br from-muted/40 to-muted/20 border-2 border-dashed border-muted-foreground/30 shadow-lg">
                            <Database className="h-16 w-16 text-muted-foreground/60 mx-auto" />
                          </div>
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary/20 rounded-full animate-pulse"></div>
                        </div>
                        <div className="space-y-3 text-center">
                          <p className="text-xl font-semibold text-muted-foreground">
                            {t("noDataFound")}
                          </p>
                          <p className="text-sm text-muted-foreground/80 max-w-md mx-auto leading-relaxed">
                            {t("noMatchingExecutionRecords")}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {paginatedChecks.map((check, index) => (
                  <React.Fragment key={check._id}>
                    <TableRow
                      className={cn(
                        "group/row transition-all duration-200 hover:bg-gradient-to-r hover:from-muted/30 hover:to-muted/10 hover:shadow-sm",
                        index % 2 === 0 ? "bg-background" : "bg-muted/5",
                      )}
                    >
                      <TableCell className="px-4 py-4">
                        <div className="flex justify-center">
                          {check.statusType === "attention_needed" ? (
                            <Badge
                              variant="outline"
                              className="bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-300/60 dark:from-amber-950/20 dark:to-yellow-950/20 dark:text-amber-400 dark:border-amber-700/50 text-xs font-medium shadow-sm"
                            >
                              <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-amber-600 dark:text-amber-500" />
                              {t("needsAttention") || "Attention"}
                            </Badge>
                          ) : check.status === "success" ? (
                            <Badge
                              variant="outline"
                              className="bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-300/60 dark:from-green-950/20 dark:to-emerald-950/20 dark:text-green-400 dark:border-green-700/50 text-xs font-medium shadow-sm"
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-600 dark:text-green-500" />
                              {t("filterSuccess")}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-300/60 dark:from-red-950/20 dark:to-rose-950/20 dark:text-red-400 dark:border-red-700/50 text-xs font-medium shadow-sm"
                            >
                              <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-red-600 dark:text-red-500" />
                              {t("filterFailed")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className="font-semibold px-4 py-4 max-w-64 group-hover/row:text-primary transition-colors duration-200"
                        title={check.script_name}
                      >
                        <div className="truncate">{check.script_name}</div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground px-4 py-4 max-w-52 font-mono text-sm">
                        <div className="truncate">
                          {formatDate(check.execution_time, language)}
                        </div>
                      </TableCell>
                      <TableCell
                        className="hidden md:table-cell px-4 py-4 text-sm leading-relaxed"
                        title={check.findings || check.message || t("noData")}
                      >
                        <div className="max-w-md truncate">
                          {check.findings || check.message || (
                            <span className="italic text-muted-foreground/80">
                              {t("noData")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center px-4 py-4">
                        <div className="flex justify-center">
                          <Link
                            href={`/view-execution-result/${check._id}`}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-4 gap-2 text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-md hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-950/20 dark:hover:border-blue-700/50 dark:hover:text-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                              title={
                                t("viewFullReportButton") || "View Full Report"
                              }
                            >
                                <ExternalLink size={14} />
                                <span className="hidden sm:inline">
                                  {t("viewFullReportButton") || "View Report"}
                                </span>
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between border-t px-5 py-3 text-xs gap-2 relative z-10">
          <div className="text-muted-foreground text-center sm:text-left">
            {t("pageInfo")
              .replace("%s", String(startIndex + 1))
              .replace("%s", String(Math.min(endIndex, allChecksCount)))
              .replace("%s", String(allChecksCount))
              .replace("%s", String(currentPage))
              .replace("%s", String(totalPages))}
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

              {totalPages > 5 && (
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
  );
};
