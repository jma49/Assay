import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardFooter } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

/**
 * 分页组件的Props接口
 */
export interface PaginationProps {
  /** 当前页码 */
  currentPage: number;
  /** 总页数 */
  totalPages: number;
  /** 总项目数 */
  totalItems: number;
  /** 每页项目数 */
  itemsPerPage: number;
  /** 当前页输入值 */
  pageInput: string;
  /** 页码变化回调 */
  onPageChange: (page: number) => void;
  /** 页码输入变化回调 */
  onPageInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** 页码输入提交回调 */
  onPageInputSubmit: (e: React.FormEvent) => void;
  /** 页码输入键盘事件回调 */
  onPageInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** 翻译函数 */
  translate: (key: string) => string;
  /** 是否显示在卡片底部 */
  showInCard?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 可复用的分页组件
 * 包含完整的分页功能：上一页、下一页、跳转到指定页面、显示分页信息等
 */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  pageInput,
  onPageChange,
  onPageInputChange,
  onPageInputSubmit,
  onPageInputKeyDown,
  translate: t,
  showInCard = true,
  className = '',
}: PaginationProps) {
  // 如果只有一页或没有数据，不显示分页
  if (totalPages <= 1) return null;

  // 计算显示范围
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  /**
   * 格式化分页信息
   * 格式：显示第 X-Y 条，共 Z 条 (第 M 页，共 N 页)
   */
  const formatPageInfo = (): string => {
    return t("pageInfo")
      .replace("%s", String(startIndex))
      .replace("%s", String(endIndex))
      .replace("%s", String(totalItems))
      .replace("%s", String(currentPage))
      .replace("%s", String(totalPages));
  };

  const paginationContent = (
    <div className={`flex flex-col sm:flex-row items-center justify-between text-xs gap-2 ${className}`}>
      {/* 分页信息 */}
      <div className="text-muted-foreground text-center sm:text-left">
        {formatPageInfo()}
      </div>

      {/* 分页控件 */}
      <div className="flex items-center gap-2">
        {/* 上一页按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="h-7 px-2 text-xs shadow-sm hover:shadow transition-all duration-150"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          <span className="hidden sm:inline">{t("previous")}</span>
        </Button>

        {/* 页码信息和跳转 */}
        <div className="flex items-center gap-1.5 px-2">
          {/* 桌面端显示首尾页码 */}
          <div className="hidden md:flex items-center gap-1">
            {currentPage > 1 && (
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
            {currentPage > 3 && (
              <span className="text-muted-foreground">...</span>
            )}
          </div>

          {/* 当前页信息 */}
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-xs">
              {t("pageNumber")}
            </span>
            <Badge variant="outline" className="h-5 px-1.5 text-xs font-medium">
              {currentPage}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {t("of")} {totalPages} {t("pages")}
            </span>
          </div>

          {/* 桌面端显示尾页 */}
          <div className="hidden md:flex items-center gap-1">
            {currentPage < totalPages - 2 && (
              <span className="text-muted-foreground">...</span>
            )}
            {currentPage < totalPages && (
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

          {/* 大屏幕显示页面跳转 */}
          {totalPages > 2 && (
            <div className="hidden lg:flex items-center gap-1 ml-2">
              <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
              <form
                onSubmit={onPageInputSubmit}
                className="flex items-center gap-1"
              >
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={pageInput}
                  onChange={onPageInputChange}
                  onKeyDown={onPageInputKeyDown}
                  placeholder={t("jumpToPage")}
                  className="w-12 h-6 px-1 text-xs text-center border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  aria-label={t("jumpToPage")}
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

        {/* 下一页按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="h-7 px-2 text-xs shadow-sm hover:shadow transition-all duration-150"
        >
          <span className="hidden sm:inline">{t("next")}</span>
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );

  // 如果需要在卡片中显示，包装在CardFooter中
  if (showInCard) {
    return (
      <CardFooter className="border-t px-5 py-3">
        {paginationContent}
      </CardFooter>
    );
  }

  // 否则直接返回内容
  return <div className={`px-5 py-3 ${className}`}>{paginationContent}</div>;
}

export default Pagination; 