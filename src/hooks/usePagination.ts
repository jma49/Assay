import { useState, useCallback, useMemo } from "react";

/**
 * 分页Hook的参数接口
 */
export interface UsePaginationOptions {
  /** 初始页码，默认为1 */
  initialPage?: number;
  /** 每页项目数，默认为10 */
  itemsPerPage?: number;
  /** 总项目数 */
  totalItems: number;
}

/**
 * 分页Hook的返回值接口
 */
export interface UsePaginationReturn {
  /** 当前页码 */
  currentPage: number;
  /** 总页数 */
  totalPages: number;
  /** 每页项目数 */
  itemsPerPage: number;
  /** 页面跳转输入值 */
  pageInput: string;
  /** 当前页开始索引 */
  startIndex: number;
  /** 当前页结束索引 */
  endIndex: number;
  /** 设置当前页 */
  setCurrentPage: (page: number) => void;
  /** 上一页 */
  goToPreviousPage: () => void;
  /** 下一页 */
  goToNextPage: () => void;
  /** 跳转到第一页 */
  goToFirstPage: () => void;
  /** 跳转到最后一页 */
  goToLastPage: () => void;
  /** 处理页面输入变化 */
  handlePageInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** 处理页面输入提交 */
  handlePageInputSubmit: (e: React.FormEvent) => void;
  /** 处理页面输入键盘事件 */
  handlePageInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** 重置到第一页 */
  resetToFirstPage: () => void;
  /** 是否有上一页 */
  hasPreviousPage: boolean;
  /** 是否有下一页 */
  hasNextPage: boolean;
}

/**
 * 分页自定义Hook
 * 管理分页状态和相关逻辑，包括页码跳转、输入验证等
 *
 * @param options 分页配置选项
 * @returns 分页状态和操作函数
 *
 * @example
 * ```tsx
 * const {
 *   currentPage,
 *   totalPages,
 *   startIndex,
 *   endIndex,
 *   setCurrentPage,
 *   handlePageInputChange,
 *   handlePageInputSubmit,
 *   handlePageInputKeyDown,
 *   pageInput
 * } = usePagination({
 *   totalItems: 100,
 *   itemsPerPage: 10
 * });
 *
 * const paginatedData = data.slice(startIndex, endIndex);
 * ```
 */
export function usePagination({
  initialPage = 1,
  itemsPerPage = 10,
  totalItems,
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPageState] = useState(initialPage);
  const [pageInput, setPageInput] = useState("");

  // 计算总页数
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / itemsPerPage));
  }, [totalItems, itemsPerPage]);

  // 计算当前页的索引范围
  const { startIndex, endIndex } = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, totalItems);
    return { startIndex: start, endIndex: end };
  }, [currentPage, itemsPerPage, totalItems]);

  // 判断是否有上一页/下一页
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  /**
   * 安全地设置页码，确保在有效范围内
   */
  const setCurrentPage = useCallback(
    (page: number) => {
      const safePage = Math.max(1, Math.min(page, totalPages));
      setCurrentPageState(safePage);
    },
    [totalPages]
  );

  /**
   * 跳转到上一页
   */
  const goToPreviousPage = useCallback(() => {
    setCurrentPage(currentPage - 1);
  }, [currentPage, setCurrentPage]);

  /**
   * 跳转到下一页
   */
  const goToNextPage = useCallback(() => {
    setCurrentPage(currentPage + 1);
  }, [currentPage, setCurrentPage]);

  /**
   * 跳转到第一页
   */
  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, [setCurrentPage]);

  /**
   * 跳转到最后一页
   */
  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [setCurrentPage, totalPages]);

  /**
   * 重置到第一页
   */
  const resetToFirstPage = useCallback(() => {
    setCurrentPage(1);
    setPageInput("");
  }, [setCurrentPage]);

  /**
   * 处理页面输入变化
   */
  const handlePageInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPageInput(e.target.value);
    },
    []
  );

  /**
   * 处理页面输入提交
   */
  const handlePageInputSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const page = parseInt(pageInput, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        setCurrentPage(page);
        setPageInput("");
      }
    },
    [pageInput, totalPages, setCurrentPage]
  );

  /**
   * 处理页面输入键盘事件
   * 只允许输入数字和特定控制键
   */
  const handlePageInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handlePageInputSubmit(e);
        return;
      }

      // 允许的键：数字、退格、删除、箭头键、Tab
      const allowedKeys = [
        "Backspace",
        "Delete",
        "Tab",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ];

      const isNumber = /^[0-9]$/.test(e.key);
      const isAllowedKey = allowedKeys.includes(e.key);

      if (!isNumber && !isAllowedKey) {
        e.preventDefault();
      }
    },
    [handlePageInputSubmit]
  );

  // 当总项目数变化时，确保当前页仍然有效
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPageState(totalPages);
    }
  }, [currentPage, totalPages]);

  return {
    currentPage,
    totalPages,
    itemsPerPage,
    pageInput,
    startIndex,
    endIndex,
    setCurrentPage,
    goToPreviousPage,
    goToNextPage,
    goToFirstPage,
    goToLastPage,
    handlePageInputChange,
    handlePageInputSubmit,
    handlePageInputKeyDown,
    resetToFirstPage,
    hasPreviousPage,
    hasNextPage,
  };
}

export default usePagination;
