"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { isJumpInputKey, parseJumpPage } from "@/lib/utils/pagination";
import { cn } from "@/lib/utils/utils";

type PaginationKey =
  | "previous"
  | "next"
  | "jumpToFirst"
  | "jumpToLast"
  | "pageNumber"
  | "of"
  | "pages"
  | "jumpToPage"
  | "pageJump";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** The filled "Showing x-y of n" line. */
  pageInfo: string;
  t: (key: PaginationKey) => string;
  onPageChange: (page: number) => void;
  /** Disables previous/next, e.g. while the next page loads. */
  disabled?: boolean;
  /** The jump box shows from this many pages on. */
  jumpMinPages?: number;
  /** Lifts the controls into their own stacking layers so overlapping card content cannot swallow clicks. */
  layered?: boolean;
}

/** A card footer with previous/next, first/last shortcuts and a jump-to-page box. */
export function Pagination({
  page,
  totalPages,
  pageInfo,
  t,
  onPageChange,
  disabled = false,
  jumpMinPages = 3,
  layered = true,
}: PaginationProps) {
  const [pageInput, setPageInput] = useState("");
  const jumpPage = parseJumpPage(pageInput, totalPages);
  const layer = (className: string) => (layered ? className : undefined);
  const pointerStyle = layered ? ({ pointerEvents: "auto" } as const) : undefined;

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

  return (
    <CardFooter className={cn("flex flex-col sm:flex-row items-center justify-between border-t px-5 py-3 text-xs gap-2", layer("relative z-10"))}>
      <div className="text-muted-foreground text-center sm:text-left">{pageInfo}</div>
      <div className={cn("flex items-center gap-2", layer("relative z-20"))}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page === 1 || disabled}
          className={cn("h-7 px-2 text-xs transition-[color,background-color,border-color,box-shadow,opacity,width] duration-150", layer("relative z-30"))}
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          <span className="hidden sm:inline">{t("previous")}</span>
        </Button>

        <div className={cn("flex items-center gap-1.5 px-2", layer("relative z-30"))}>
          <div className="hidden md:flex items-center gap-1">
            {page > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(1)}
                className={cn("h-6 px-1 text-xs text-muted-foreground hover:text-foreground", layer("relative z-40"))}
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
                className={cn("h-6 px-1 text-xs text-muted-foreground hover:text-foreground", layer("relative z-40"))}
                title={t("jumpToLast")}
              >
                {totalPages}
              </Button>
            )}
          </div>

          {totalPages >= jumpMinPages && (
            <div className={cn("hidden lg:flex items-center gap-1 ml-2", layer("relative z-40"))}>
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
                  className={cn(
                    "w-12 h-6 px-1 text-xs text-center border border-input bg-card rounded-[3px] focus:outline-none focus:ring-1 focus:ring-ring",
                    layer("relative z-50"),
                  )}
                  style={pointerStyle}
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={jumpPage === null}
                  className={cn("h-6 px-2 text-xs", layer("relative z-50"))}
                  title={t("pageJump")}
                  style={pointerStyle}
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
          disabled={page === totalPages || disabled}
          className={cn("h-7 px-2 text-xs transition-[color,background-color,border-color,box-shadow,opacity,width] duration-150", layer("relative z-30"))}
        >
          <span className="hidden sm:inline">{t("next")}</span>
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </CardFooter>
  );
}
