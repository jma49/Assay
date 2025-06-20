/**
 * 分页配置常量
 * 集中管理各页面的分页参数，提供更好的维护性和一致性
 *
 * @author AI Assistant
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * 页面类型枚举
 * 用于标识不同页面的分页需求
 */
export enum PageType {
  CHECK_HISTORY = "CHECK_HISTORY",
  SCRIPTS = "SCRIPTS",
  APPROVALS = "APPROVALS",
  EDIT_HISTORY = "EDIT_HISTORY",
  USER_MANAGEMENT = "USER_MANAGEMENT",
  DATA_ANALYSIS = "DATA_ANALYSIS",
  DEFAULT = "DEFAULT",
}

/**
 * 分页配置接口
 * 定义每个页面的分页参数结构
 */
export interface PaginationConfig {
  /** 每页显示的条目数 */
  itemsPerPage: number;
  /** 最大加载条目数（用于性能限制） */
  maxItems: number;
  /** 页面描述（用于日志和调试） */
  description?: string;
}

/**
 * 完整的分页配置映射
 * 为每个页面类型定义具体的分页参数
 */
export const PAGINATION_CONFIGS: Record<PageType, PaginationConfig> = {
  [PageType.CHECK_HISTORY]: {
    itemsPerPage: 50,
    maxItems: 2000,
    description: "Check History页面 - 检查历史记录",
  },
  [PageType.SCRIPTS]: {
    itemsPerPage: 10,
    maxItems: 500,
    description: "脚本管理页面",
  },
  [PageType.APPROVALS]: {
    itemsPerPage: 10,
    maxItems: 500,
    description: "审批管理页面",
  },
  [PageType.EDIT_HISTORY]: {
    itemsPerPage: 20,
    maxItems: 1000,
    description: "编辑历史页面",
  },
  [PageType.USER_MANAGEMENT]: {
    itemsPerPage: 10,
    maxItems: 500,
    description: "用户管理页面",
  },
  [PageType.DATA_ANALYSIS]: {
    itemsPerPage: 10,
    maxItems: 500,
    description: "数据分析页面",
  },
  [PageType.DEFAULT]: {
    itemsPerPage: 10,
    maxItems: 500,
    description: "默认分页配置",
  },
} as const;

/**
 * 获取指定页面类型的分页配置
 * @param pageType 页面类型
 * @returns 分页配置对象
 */
export function getPaginationConfig(pageType: PageType): PaginationConfig {
  return PAGINATION_CONFIGS[pageType] || PAGINATION_CONFIGS[PageType.DEFAULT];
}

/**
 * 获取指定页面类型的每页条目数
 * @param pageType 页面类型
 * @returns 每页条目数
 */
export function getItemsPerPage(pageType: PageType): number {
  return getPaginationConfig(pageType).itemsPerPage;
}

/**
 * 获取指定页面类型的最大条目数
 * @param pageType 页面类型
 * @returns 最大条目数
 */
export function getMaxItems(pageType: PageType): number {
  return getPaginationConfig(pageType).maxItems;
}

/**
 * 计算总页数
 * @param totalItems 总条目数
 * @param pageType 页面类型
 * @returns 总页数
 */
export function calculateTotalPages(
  totalItems: number,
  pageType: PageType
): number {
  const itemsPerPage = getItemsPerPage(pageType);
  return Math.ceil(totalItems / itemsPerPage);
}

/**
 * 计算分页的开始和结束索引
 * @param currentPage 当前页码（从1开始）
 * @param pageType 页面类型
 * @returns 开始索引和结束索引的对象
 */
export function calculatePageIndices(
  currentPage: number,
  pageType: PageType
): { startIndex: number; endIndex: number } {
  const itemsPerPage = getItemsPerPage(pageType);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  return { startIndex, endIndex };
}

/**
 * 验证页码是否有效
 * @param page 页码
 * @param totalItems 总条目数
 * @param pageType 页面类型
 * @returns 是否为有效页码
 */
export function isValidPage(
  page: number,
  totalItems: number,
  pageType: PageType
): boolean {
  if (page < 1) return false;
  const totalPages = calculateTotalPages(totalItems, pageType);
  return page <= totalPages;
}

/**
 * 规范化页码（确保在有效范围内）
 * @param page 输入页码
 * @param totalItems 总条目数
 * @param pageType 页面类型
 * @returns 规范化后的页码
 */
export function normalizePage(
  page: number,
  totalItems: number,
  pageType: PageType
): number {
  if (totalItems === 0) return 1;

  const totalPages = calculateTotalPages(totalItems, pageType);

  if (page < 1) return 1;
  if (page > totalPages) return totalPages;

  return page;
}

/**
 * 向后兼容的常量导出
 * 保持与现有代码的兼容性，同时提供新的配置化方式
 */

// 保持向后兼容的默认常量
export const ITEMS_PER_PAGE = PAGINATION_CONFIGS[PageType.DEFAULT].itemsPerPage;
export const CHECK_HISTORY_ITEMS_PER_PAGE =
  PAGINATION_CONFIGS[PageType.CHECK_HISTORY].itemsPerPage;

// 新的推荐使用方式
export { PageType as PaginationPageType };
