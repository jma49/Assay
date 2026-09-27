"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import type { DashboardTranslationKeys } from "@/components/business/dashboard/types";
import { isPageJumpKey, parsePageJump } from "./members";

interface MembersPaginationProps {
  currentPage: number;
  totalPages: number;
  pageInfo: string;
  t: (key: DashboardTranslationKeys) => string;
  onPageChange: (page: number) => void;
}

export function MembersPagination({ currentPage, totalPages, pageInfo, t, onPageChange }: MembersPaginationProps) {
  const [pageInput, setPageInput] = useState("");

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parsePageJump(pageInput, totalPages);
    if (page !== null) {
      onPageChange(page);
      setPageInput("");
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handlePageInputSubmit(e);
    }
    if (!isPageJumpKey(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <CardFooter className="flex flex-col sm:flex-row items-center justify-between border-t px-5 py-3 text-xs gap-2 relative z-10">
      <div className="text-muted-foreground text-center sm:text-left">
        {pageInfo}
      </div>
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
                onClick={() => onPageChange(totalPages)}
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
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={handlePageInputKeyDown}
                  placeholder={t("jumpToPage")}
                  className="w-12 h-6 px-1 text-xs text-center border border-input bg-card rounded-[3px] focus:outline-none focus:ring-1 focus:ring-ring relative z-50"
                  style={{ pointerEvents: "auto" }}
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={parsePageJump(pageInput, totalPages) === null}
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
            onPageChange(Math.min(currentPage + 1, totalPages))
          }
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
