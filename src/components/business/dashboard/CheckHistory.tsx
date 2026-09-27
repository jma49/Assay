import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Database,
  Search,
  X,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils/utils";
import { Check, DashboardTranslationKeys } from "./types";
import { formatDate } from "./utils";
import { formatRelative } from "@/lib/utils/datetime";
import { CompactHashtagFilter } from "@/components/ui/compact-hashtag-filter";

interface CheckHistoryProps {
  paginatedChecks: Check[];
  allChecksCount: number;
  totalUnfilteredCount: number;
  totalPages: number;
  currentPage: number;
  searchTerm: string;
  selectedHashtags?: string[];
  sortConfig: {
    key: keyof Check | "";
    direction: "ascending" | "descending";
  };
  language: string;
  t: (key: DashboardTranslationKeys) => string;
  setSearchTerm: (term: string) => void;
  setSelectedHashtags?: (hashtags: string[]) => void;
  setCurrentPage: (page: number) => void;
  requestSort: (key: keyof Check) => void;
  startIndex: number;
  endIndex: number;
  availableScripts?: { scriptId: string; name?: string; cnName?: string; hashtags?: string[] }[];
  isLoading?: boolean;
}

function StatusLabel({
  check,
  t,
}: {
  check: Check;
  t: (key: DashboardTranslationKeys) => string;
}) {
  const [tone, label] =
    check.statusType === "attention_needed"
      ? ["attention", t("needsAttention") || "Attention"]
      : check.status === "success"
        ? ["success", t("filterSuccess")]
        : ["failure", t("filterFailed")];
  const color = {
    success: "text-success",
    attention: "text-attention",
    failure: "text-failure",
  }[tone];
  const gem = {
    success: "status-dot-clean",
    attention: "status-dot-issues",
    failure: "status-dot-error",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-2 text-[13px]", color)}>
      <span className={cn("status-dot", gem)} aria-hidden />
      {label}
    </span>
  );
}

export const CheckHistory: React.FC<CheckHistoryProps> = ({
  paginatedChecks,
  allChecksCount,
  totalUnfilteredCount,
  totalPages,
  currentPage,
  searchTerm,
  selectedHashtags = [],
  sortConfig,
  language,
  t,
  setSearchTerm,
  setSelectedHashtags,
  setCurrentPage,
  requestSort,
  startIndex,
  endIndex,
  availableScripts = [],
  isLoading = false,
}) => {
  const router = useRouter();
  const displayNames = useMemo(
    () =>
      new Map(
        availableScripts.map((script) => [
          script.scriptId,
          (language === "zh" ? script.cnName || script.name : script.name) || script.scriptId,
        ]),
      ),
    [availableScripts, language],
  );
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
    <Card className="relative gap-0 overflow-hidden py-0">
      <CardHeader className="relative border-b px-6 py-4">
        <CardDescription className="text-[13px]">
          {t("historyDesc").replace("%s", String(totalUnfilteredCount))} ·{" "}
          {t("viewAndManageAllRecords")}
        </CardDescription>

        <div className="pt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative sm:col-span-3">
              <Search className="absolute left-3 top-3 z-10 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-input bg-card h-10 w-full rounded-[4px] pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
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
        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 px-6 text-[13px] font-normal text-muted-foreground w-36">
                    <div className="flex items-center gap-2">
                      {t("tableStatus")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:text-foreground transition-colors px-4 text-[13px] font-normal text-muted-foreground group/sort w-64"
                    onClick={() => requestSort("script_name")}
                  >
                    <div className="flex items-center gap-3">
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
                    className="hidden lg:table-cell cursor-pointer hover:text-foreground transition-colors px-4 text-[13px] font-normal text-muted-foreground group/sort w-52"
                    onClick={() => requestSort("execution_time")}
                  >
                    <div className="flex items-center gap-3">
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
                  <TableHead className="hidden md:table-cell px-4 text-[13px] font-normal text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {t("tableFindings")}
                    </div>
                  </TableHead>
                  <TableHead className="px-6 text-right text-[13px] font-normal text-muted-foreground w-44">
                    <div className="flex items-center justify-end gap-2">
                      {t("tableActions")}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
                      className="h-48 text-center  "
                    >
                      <div className="flex flex-col items-center justify-center space-y-6">
                        <div className="relative">
                          <div className="p-8 rounded-lg border border-dashed border-muted-foreground/30 ">
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
                  paginatedChecks.map((check) => (
                  <React.Fragment key={check._id}>
                    <TableRow
                      className="group/row cursor-pointer"
                      onClick={(event) => {
                        // Links and buttons inside the row keep their own action.
                        if ((event.target as HTMLElement).closest("a, button")) return;
                        router.push(`/view-execution-result/${check._id}`);
                      }}
                    >
                      <TableCell className="px-6 py-3">
                        <StatusLabel check={check} t={t} />
                      </TableCell>
                      <TableCell
                        className="max-w-64 px-4 py-3 font-medium"
                        title={check.script_name}
                      >
                        <Link
                          href={`/manage-scripts?scriptId=${encodeURIComponent(check.script_name)}`}
                          className="block truncate underline-offset-4 hover:underline"
                        >
                          {displayNames.get(check.script_name) ?? check.script_name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden max-w-52 px-4 py-3 text-[13px] text-muted-foreground tabular-nums lg:table-cell">
                        <time
                          className="block truncate"
                          dateTime={check.execution_time}
                          title={formatDate(check.execution_time, language)}
                        >
                          {formatRelative(check.execution_time, language)}
                        </time>
                      </TableCell>
                      <TableCell
                        className="hidden px-4 py-3 text-sm md:table-cell"
                        title={check.findings || check.message || t("noData")}
                      >
                        <div className="max-w-md truncate">
                          {check.findings || check.message || (
                            <span className="text-muted-foreground">
                              {t("noData")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-3 text-right">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="-mr-2 h-8 gap-1.5 px-2 text-[13px] text-muted-foreground hover:text-foreground"
                          title={t("viewFullReportButton") || "View Full Report"}
                        >
                          <Link href={`/view-execution-result/${check._id}`}>
                            <span className="hidden sm:inline">
                              {t("viewFullReportButton") || "View Report"}
                            </span>
                            <ChevronRight className="size-3.5" />
                          </Link>
                        </Button>
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
                      className="w-12 h-6 px-1 text-xs text-center border border-input bg-card rounded-[3px] focus:outline-none focus:ring-1 focus:ring-ring relative z-50"
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
  );
};
