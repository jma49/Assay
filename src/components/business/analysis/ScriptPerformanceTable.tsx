import { useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ITEMS_PER_PAGE } from "@/components/business/dashboard/types";
import { formatDate } from "@/components/business/dashboard/utils";
import { cn } from "@/lib/utils/utils";
import type { ScriptAnalytics } from "./analytics";

const NAVIGATION_KEYS = ["ArrowLeft", "ArrowRight", "Delete", "Backspace", "Tab"];

/** Per-check pass rates, paged. Remount (via key) to go back to the first page. */
export function ScriptPerformanceTable({ scripts, language, t }: { scripts: ScriptAnalytics[]; language: string; t: (key: string) => string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const totalPages = Math.ceil(scripts.length / ITEMS_PER_PAGE);

  const handlePageInputChange = (e: ChangeEvent<HTMLInputElement>) => setPageInput(e.target.value);

  const handlePageInputSubmit = (e: FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput("");
    }
  };

  const handlePageInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handlePageInputSubmit(e);
    if (!/[\d\b]/.test(e.key) && !NAVIGATION_KEYS.includes(e.key)) e.preventDefault();
  };

  const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const end = Math.min(currentPage * ITEMS_PER_PAGE, scripts.length);
  const pageInfo = [start, end, scripts.length, currentPage, totalPages].reduce(
    (text: string, value) => text.replace("%s", String(value)),
    t("pageInfo"),
  );

  return (
    <Card className="relative overflow-hidden gap-0 py-0">

      <CardHeader className="relative border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="space-y-2">
            <CardTitle>
              {t("scriptPerformanceAnalysis")}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-[13px] text-muted-foreground">
                <th className="h-10 px-6 text-left font-normal">{language === "zh" ? "脚本" : "Script"}</th>
                <th className="h-10 w-20 px-4 text-right font-normal">{t("executionsLabel")}</th>
                <th className="h-10 w-20 px-4 text-right font-normal">{t("successLabel")}</th>
                <th className="h-10 w-20 px-4 text-right font-normal">{t("attentionLabel")}</th>
                <th className="h-10 w-20 px-4 text-right font-normal">{t("failedLabel")}</th>
                <th className="h-10 w-48 px-4 text-left font-normal">{t("successRateLabel")}</th>
                <th className="h-10 w-56 px-6 text-right font-normal">{t("lastExecution")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {scripts
                              .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((script) => (
                  <tr key={script.scriptId} className="hover:bg-muted/40">
                    <td className="max-w-0 px-6 py-3">
                      <p className="truncate font-medium" title={script.scriptName}>
                        {script.scriptName}
                      </p>
                      <p className="truncate font-mono text-[12px] text-muted-foreground">
                        {script.scriptId}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{script.totalExecutions}</td>
                    <td className={cn("px-4 py-3 text-right tabular-nums", script.successCount ? "text-success" : "text-muted-foreground")}>{script.successCount}</td>
                    <td className={cn("px-4 py-3 text-right tabular-nums", script.attentionCount ? "text-attention" : "text-muted-foreground")}>{script.attentionCount}</td>
                    <td className={cn("px-4 py-3 text-right tabular-nums", script.failedCount ? "text-failure" : "text-muted-foreground")}>{script.failedCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              script.successRate >= 80 ? "bg-success" : script.successRate > 0 ? "bg-attention" : "bg-failure",
                            )}
                            style={{ width: `${Math.max(script.successRate, 2)}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-[13px] tabular-nums">
                          {script.successRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right text-[13px] whitespace-nowrap text-muted-foreground tabular-nums">
                      {script.lastExecution ? formatDate(script.lastExecution, language) : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      {scripts.length > ITEMS_PER_PAGE && (
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between border-t px-5 py-3 text-xs gap-2 relative z-10">
          <div className="text-muted-foreground text-center sm:text-left">
            {pageInfo}
          </div>
          <div className="flex items-center gap-2 relative z-20">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className="h-7 px-2 text-xs transition-[color,background-color,border-color,box-shadow,opacity,width] duration-150 relative z-30"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">{t("previous")}</span>
            </Button>

            <div className="flex items-center gap-1.5 px-2 relative z-30">
              {(() => {
                const totalPages = Math.ceil(scripts.length / ITEMS_PER_PAGE);
                return (
                  <>
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
                  </>
                );
              })()}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const totalPages = Math.ceil(scripts.length / ITEMS_PER_PAGE);
                setCurrentPage(Math.min(currentPage + 1, totalPages));
              }}
              disabled={currentPage === Math.ceil(scripts.length / ITEMS_PER_PAGE)}
              className="h-7 px-2 text-xs transition-[color,background-color,border-color,box-shadow,opacity,width] duration-150 relative z-30"
            >
              <span className="hidden sm:inline">{t("next")}</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
