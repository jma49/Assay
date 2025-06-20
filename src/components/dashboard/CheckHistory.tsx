import React, { useState, useMemo } from "react";
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
import { CompactHashtagFilter } from "@/components/ui/compact-hashtag-filter";

interface CheckHistoryProps {
  paginatedChecks: Check[];
  allChecksCount: number;
  totalUnfilteredCount: number;
  totalPages: number;
  currentPage: number;
  filterStatus: string | null;
  searchTerm: string;
  selectedHashtags?: string[];
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
  setSelectedHashtags?: (hashtags: string[]) => void;
  setCurrentPage: (page: number) => void;
  requestSort: (key: keyof Check) => void;
  startIndex: number;
  endIndex: number;
  availableScripts?: { scriptId: string; hashtags?: string[] }[];
  isLoading?: boolean;
}

export const CheckHistory: React.FC<CheckHistoryProps> = ({
  paginatedChecks,
  allChecksCount,
  totalUnfilteredCount,
  totalPages,
  currentPage,
  filterStatus,
  searchTerm,
  selectedHashtags = [],
  sortConfig,
  successCount,
  failureCount,
  needsAttentionCount,
  language,
  t,
  setFilterStatus,
  setSearchTerm,
  setSelectedHashtags,
  setCurrentPage,
  requestSort,
  startIndex,
  endIndex,
  availableScripts = [],
  isLoading = false,
}) => {
  const [pageInput, setPageInput] = useState("");

  const availableHashtags = useMemo(() => {
    const hashtagSet = new Set<string>();
    availableScripts.forEach(script => {
      if (script.hashtags && Array.isArray(script.hashtags)) {
        script.hashtags.forEach(tag => hashtagSet.add(tag));
      }
    });
    return Array.from(hashtagSet).sort();
  }, [availableScripts]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput("");
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handlePageInputSubmit(e);
    }
    if (
      !/[\d\b]/.test(e.key) &&
      !["ArrowLeft", "ArrowRight", "Delete", "Backspace", "Tab"].includes(e.key)
    ) {
      e.preventDefault();
    }
  };

  return (
    <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
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
        </div>

        <div className="pt-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterStatus(null);
                setCurrentPage(1);
              }}
              className={cn(
                "h-10 px-3 gap-2 text-sm transition-all duration-300 shadow-sm hover:shadow-md group/filter",
                filterStatus === null &&
                  "ring-2 ring-primary/50 ring-offset-1 border-primary/30 bg-primary/5 text-primary shadow-lg shadow-primary/10",
              )}
            >
              <Filter
                size={14}
                className="group-hover/filter:rotate-12 transition-transform duration-200"
              />
              <span className="font-medium">{t("filterAll")}</span>
              <Badge
                variant="secondary"
                className="ml-1 h-4 text-xs px-1.5 bg-primary/10 text-primary border-primary/20"
              >
                {totalUnfilteredCount}
              </Badge>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterStatus("success");
                setCurrentPage(1);
              }}
              className={cn(
                "h-10 px-3 gap-2 text-sm transition-all duration-300 shadow-sm hover:shadow-md group/filter",
                filterStatus === "success" &&
                  "ring-2 ring-green-500/50 ring-offset-1 border-green-500/30 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 shadow-lg shadow-green-500/10",
              )}
            >
              <CheckCircle
                size={14}
                className="group-hover/filter:scale-110 transition-transform duration-200"
              />
              <span className="font-medium">{t("filterSuccess")}</span>
              <Badge
                variant="secondary"
                className="ml-1 h-4 text-xs px-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
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
              }}
              className={cn(
                "h-10 px-3 gap-2 text-sm transition-all duration-300 shadow-sm hover:shadow-md group/filter",
                filterStatus === "attention_needed" &&
                  "ring-2 ring-amber-500/50 ring-offset-1 border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 shadow-lg shadow-amber-500/10",
              )}
            >
              <AlertCircle
                size={14}
                className="group-hover/filter:scale-110 transition-transform duration-200"
              />
              <span className="font-medium">{t("needsAttention")}</span>
              <Badge
                variant="secondary"
                className="ml-1 h-4 text-xs px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
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
              }}
              className={cn(
                "h-10 px-3 gap-2 text-sm transition-all duration-300 shadow-sm hover:shadow-md group/filter",
                filterStatus === "failure" &&
                  "ring-2 ring-red-500/50 ring-offset-1 border-red-500/30 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 shadow-lg shadow-red-500/10",
              )}
            >
              <AlertCircle
                size={14}
                className="group-hover/filter:scale-110 transition-transform duration-200"
              />
              <span className="font-medium">{t("filterFailed")}</span>
              <Badge
                variant="secondary"
                className="ml-1 h-4 text-xs px-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
              >
                {failureCount}
              </Badge>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative sm:col-span-3">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-9 pr-9 text-sm rounded-lg border-2 border-border/50 bg-background/80 backdrop-blur-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-offset-1 focus:border-primary/50 shadow-sm transition-all duration-300 placeholder:text-muted-foreground/60"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-all duration-200"
                  onClick={() => setSearchTerm("")}
                >
                  <span className="sr-only">{t("clearSearch")}</span>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {availableHashtags.length > 0 && setSelectedHashtags && (
              <div className="sm:col-span-1">
                <CompactHashtagFilter
                  availableHashtags={availableHashtags}
                  selectedHashtags={selectedHashtags}
                  onHashtagsChange={(hashtags) => {
                    setSelectedHashtags(hashtags);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10"
                />
              </div>
            )}
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
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell className="px-4 py-4">
                        <div className="flex justify-center">
                          <div className="h-6 w-20 bg-muted animate-pulse rounded"></div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell px-4 py-4">
                        <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-4 py-4">
                        <div className="h-4 w-48 bg-muted animate-pulse rounded"></div>
                      </TableCell>
                      <TableCell className="text-center px-4 py-4">
                        <div className="flex justify-center">
                          <div className="h-8 w-20 bg-muted animate-pulse rounded"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : paginatedChecks.length === 0 ? (
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
                ) : (
                  paginatedChecks.map((check, index) => (
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
                        <Link 
                          href={`/manage-scripts?scriptId=${encodeURIComponent(check.script_name)}`}
                          className="flex items-center gap-2 hover:text-primary transition-colors duration-200 group/link"
                        >
                          <div className="truncate">{check.script_name}</div>
                          <span 
                            className="text-xs opacity-60 group-hover/link:opacity-100 transition-opacity duration-200" 
                            title={t("editScript") || "编辑脚本"}
                          >
                            ✏️
                          </span>
                        </Link>
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
                  ))
                )}
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
