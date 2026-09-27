"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ITEMS_PER_PAGE } from "@/components/business/dashboard/types";
import { formatPageInfo, isPageInputKeyAllowed, parsePageInput, type Translate } from "./approvals";

interface ApprovalsPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  t: Translate;
}

export function ApprovalsPagination({ page, totalPages, totalItems, onPageChange, t }: ApprovalsPaginationProps) {
  const [pageInput, setPageInput] = useState("");

  if (totalPages <= 1) return null;

  const jumpTarget = parsePageInput(pageInput, totalPages);

  const submitJump = (e: React.FormEvent) => {
    e.preventDefault();
    if (jumpTarget !== null) {
      onPageChange(jumpTarget);
      setPageInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submitJump(e);
    if (!isPageInputKeyAllowed(e.key)) e.preventDefault();
  };

  return (
    <CardFooter className="flex flex-col sm:flex-row items-center justify-between border-t px-5 py-3 text-xs gap-2">
      <div className="text-muted-foreground text-center sm:text-left">
        {formatPageInfo(t("pageInfo"), { page, totalPages, totalItems, pageSize: ITEMS_PER_PAGE })}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page === 1}
          className="h-7 px-2 text-xs transition-[color,background-color,border-color,box-shadow,opacity,width] duration-150"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          <span className="hidden sm:inline">{t("previous")}</span>
        </Button>

        <div className="flex items-center gap-1.5 px-2">
          <div className="hidden md:flex items-center gap-1">
            {page > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(1)}
                className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
                title={t("jumpToFirst")}
              >
                1
              </Button>
            )}
            {page > 3 && <span className="text-muted-foreground">...</span>}
          </div>

          <span className="text-muted-foreground text-xs">{t("pageNumber")}</span>
          <span className="font-medium text-xs min-w-[1.5rem] text-center">{page}</span>
          <span className="text-muted-foreground text-xs">
            {t("of")} {totalPages} {t("pages")}
          </span>

          <div className="hidden md:flex items-center gap-1">
            {page < totalPages - 2 && <span className="text-muted-foreground">...</span>}
            {page < totalPages && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
                title={t("jumpToLast")}
              >
                {totalPages}
              </Button>
            )}
          </div>

          {totalPages > 2 && (
            <div className="hidden lg:flex items-center gap-1 ml-2">
              <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
              <form onSubmit={submitJump} className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("jumpToPage")}
                  className="w-12 h-6 px-1 text-xs text-center border border-input bg-card rounded-[3px] focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={jumpTarget === null}
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
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          disabled={page === totalPages}
          className="h-7 px-2 text-xs transition-[color,background-color,border-color,box-shadow,opacity,width] duration-150"
        >
          <span className="hidden sm:inline">{t("next")}</span>
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </CardFooter>
  );
}
