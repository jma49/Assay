import { useState } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { isJumpInputKey, parseJumpPage } from "@/components/business/edit-history/edit-history";
import type { DashboardTranslationKeys } from "../types";

/** The jump box only pays off once there are more pages than the shortcuts cover. */
const JUMP_BOX_MIN_PAGES = 6;

interface HistoryPaginationProps {
  t: (key: DashboardTranslationKeys) => string;
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
}

/** Previous/next, first/last shortcuts and a jump-to-page box. */
export function HistoryPagination({ t, currentPage, totalPages, totalRecords, startIndex, endIndex, onPageChange }: HistoryPaginationProps) {
  const [pageInput, setPageInput] = useState("");
  const jumpPage = parseJumpPage(pageInput, totalPages);

  const submitJump = (e: React.FormEvent) => {
    e.preventDefault();
    if (jumpPage === null) return;
    onPageChange(jumpPage);
    setPageInput("");
  };

  const handleJumpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submitJump(e);
    if (!isJumpInputKey(e.key)) e.preventDefault();
  };

  const pageInfo = [startIndex + 1, Math.min(endIndex, totalRecords), totalRecords, currentPage, totalPages].reduce<string>(
    (text, value) => text.replace("%s", String(value)),
    t("pageInfo"),
  );

  return (
    <CardFooter className="flex flex-col sm:flex-row items-center justify-between border-t px-5 py-3 text-xs gap-2 relative z-10">
      <div className="text-muted-foreground text-center sm:text-left">{pageInfo}</div>
      <div className="flex items-center gap-2 relative z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="h-7 px-2 text-xs transition-[color,background-color,border-color,box-shadow,opacity,width] duration-150 relative z-30"
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
                onClick={() => onPageChange(1)}
                className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground relative z-40"
                title={t("jumpToFirst")}
              >
                1
              </Button>
            )}
            {currentPage > 3 && <span className="text-muted-foreground">...</span>}
          </div>

          <span className="text-muted-foreground text-xs">{t("pageNumber")}</span>
          <span className="font-medium text-xs min-w-[1.5rem] text-center">{currentPage}</span>
          <span className="text-muted-foreground text-xs">
            {t("of")} {totalPages} {t("pages")}
          </span>

          <div className="hidden md:flex items-center gap-1">
            {currentPage < totalPages - 2 && <span className="text-muted-foreground">...</span>}
            {currentPage < totalPages && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground relative z-40"
                title={t("jumpToLast")}
              >
                {totalPages}
              </Button>
            )}
          </div>

          {totalPages >= JUMP_BOX_MIN_PAGES && (
            <div className="hidden lg:flex items-center gap-1 ml-2 relative z-40">
              <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
              <form onSubmit={submitJump} className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={handleJumpKeyDown}
                  placeholder={t("jumpToPage")}
                  className="w-12 h-6 px-1 text-xs text-center border border-input bg-card rounded-[3px] focus:outline-none focus:ring-1 focus:ring-ring relative z-50"
                  style={{ pointerEvents: "auto" }}
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={jumpPage === null}
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
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="h-7 px-2 text-xs transition-[color,background-color,border-color,box-shadow,opacity,width] duration-150 relative z-30"
        >
          <span className="hidden sm:inline">{t("next")}</span>
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </CardFooter>
  );
}
