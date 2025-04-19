// 类型定义
export type DashboardTranslationKeys =
  | "findings"
  | "checks"
  | "loading"
  | "refreshing"
  | "refresh"
  | "errorTitle"
  | "errorDescription"
  | "errorInfo"
  | "retry"
  | "noData"
  | "dashboardTitle"
  | "dashboardDesc"
  | "nextCheck"
  | "scheduled"
  | "automatic"
  | "manual"
  | "today"
  | "tomorrow"
  | "successRate"
  | "totalChecks"
  | "checksFailed"
  | "checksSucceeded"
  | "manualTrigger"
  | "selectScriptDesc"
  | "selectScriptLabel"
  | "loadingScripts"
  | "noScriptsAvailable"
  | "ensureConfigured"
  | "noScriptDesc"
  | "runCheck"
  | "runningCheck"
  | "triggerSuccessTitle"
  | "triggerErrorTitle"
  | "historyTitle"
  | "historyDesc"
  | "filterAll"
  | "filterSuccess"
  | "filterFailed"
  | "searchPlaceholder"
  | "clearSearch"
  | "tableStatus"
  | "tableScriptName"
  | "tableExecutionTime"
  | "tableFindings"
  | "tableActions"
  | "noMatchingRecords"
  | "clearFilters"
  | "expand"
  | "collapse"
  | "checkDetails"
  | "noResults"
  | "previous"
  | "next"
  | "pageInfo"
  | "checkTriggered"
  | "checkTriggeredDesc"
  | "triggerFailed"
  | "poweredBy"
  | "collapseDetails"
  | "expandDetails"
  | "viewInSidebar"
  | "calculating"
  | "attentionNeeded"
  | "failedChecks"
  | "viewDetailsSidebar"
  | "executionStatus"
  | "executionMessage"
  | "rawResults"
  | "noRawData"
  | "viewGitHubAction"
  | "noMessage"
  | "footerSystem"
  | "footerInfo"
  | "footerTheme";

// 定义翻译记录类型
export type TranslationRecord = Record<DashboardTranslationKeys, string>;

// 常量定义
export const CheckStatus = {
  SUCCESS: "success",
  FAILURE: "failure",
} as const;

export const ITEMS_PER_PAGE = 10;

// 接口定义
export interface Check {
  _id: string;
  script_name: string;
  execution_time: string;
  status: (typeof CheckStatus)[keyof typeof CheckStatus];
  message: string;
  findings: string;
  raw_results: Record<string, unknown>[];
  github_run_id?: string | number;
}

export interface ScriptInfo {
  id: string;
  name: string;
  description: string;
  cn_name?: string;
  cn_description?: string;
}

// 翻译配置
export const dashboardTranslations: Record<string, TranslationRecord> = {
  en: {
    // General
    loading: "Loading...",
    refreshing: "Refreshing...",
    refresh: "Refresh",
    errorTitle: "Data Loading Failed",
    errorDescription:
      "Could not connect or process the request. Check your connection or try again later.",
    errorInfo: "Error Information",
    retry: "Retry Load",
    noData: "No Data",
    // Header
    dashboardTitle: "SQL Check Dashboard",
    dashboardDesc:
      "Monitor automated SQL check tasks, track data quality and consistency in real-time.",
    // Stats Cards
    nextCheck: "Next Scheduled Check",
    calculating: "Calculating...",
    successRate: "Success Rate",
    checks: "checks",
    failedChecks: "Failed Checks",
    attentionNeeded: "%s% checks require attention",
    // Manual Trigger
    manualTrigger: "Manual Trigger Check",
    selectScriptDesc: "Select and run an SQL check script",
    loadingScripts: "Loading available scripts...",
    selectScriptLabel: "Select script to execute:",
    noScriptDesc: "No description available for this script.",
    runCheck: "Run Check",
    runningCheck: "Running...",
    triggerSuccessTitle: "Execution Successful",
    triggerErrorTitle: "Execution Failed",
    checkTriggered: "Check Triggered",
    checkTriggeredDesc: "Check successfully triggered.",
    triggerFailed: "Trigger Check Failed",
    noScriptsAvailable: "No Check Scripts Available",
    ensureConfigured: "Ensure scripts are correctly configured and deployed.",
    // History Table
    historyTitle: "Check History",
    historyDesc: "Showing results for the last %s checks",
    searchPlaceholder: "Search script name or message...",
    clearSearch: "Clear",
    filterAll: "All",
    filterSuccess: "Success",
    filterFailed: "Failure",
    tableStatus: "Status",
    tableScriptName: "Script Name",
    tableExecutionTime: "Execution Time",
    tableFindings: "Findings/Message",
    tableActions: "Actions",
    noMatchingRecords: "No matching check records found",
    clearFilters: "Clear Filters",
    // Row Actions
    collapse: "Collapse",
    expand: "Details",
    viewDetailsSidebar: "View Details in Sidebar",
    // Detail View (Sheet & Expanded Row)
    checkDetails: "Check Details",
    executionStatus: "Execution Status:",
    executionMessage: "Execution Message:",
    findings: "Findings:",
    rawResults: "Raw Query Results:",
    noRawData: "No raw data",
    viewGitHubAction: "View GitHub Action",
    noMessage: "No message",
    // Footer
    footerSystem: "SQL Check System",
    footerInfo:
      "Automated checks driven by GitHub Actions, data stored in MongoDB.",
    footerTheme: "Current Theme: %s",
    previous: "Previous",
    next: "Next",
    pageInfo: "Page %s of %s",
    collapseDetails: "Collapse details",
    expandDetails: "Expand details",
    viewInSidebar: "View in sidebar",
    // 以下是需要补充的键
    scheduled: "Scheduled",
    automatic: "Automatic",
    manual: "Manual",
    today: "Today",
    tomorrow: "Tomorrow",
    totalChecks: "Total Checks",
    checksSucceeded: "Successful Checks",
    checksFailed: "Failed Checks",
    noResults: "No Results",
    poweredBy: "Powered by",
  },
  zh: {
    // General
    loading: "加载中...",
    refreshing: "刷新中...",
    refresh: "刷新",
    errorTitle: "数据加载失败",
    errorDescription:
      "无法连接到服务器或处理请求时出错。请检查您的网络连接或稍后重试。",
    errorInfo: "错误信息",
    retry: "重试加载",
    noData: "无数据",
    // Header
    dashboardTitle: "SQL 检查仪表盘",
    dashboardDesc:
      "实时监控自动化 SQL 检查任务执行情况，追踪数据质量和一致性。",
    // Stats Cards
    nextCheck: "下次计划检查",
    calculating: "计算中...",
    successRate: "成功率",
    checks: "次检查",
    failedChecks: "失败检查",
    attentionNeeded: "%s% 的检查需要关注",
    // Manual Trigger
    manualTrigger: "手动触发检查",
    selectScriptDesc: "选择并运行SQL检查脚本",
    loadingScripts: "加载可用脚本...",
    selectScriptLabel: "选择要执行的脚本:",
    noScriptDesc: "此脚本没有描述信息。",
    runCheck: "执行检查",
    runningCheck: "执行中...",
    triggerSuccessTitle: "执行成功",
    triggerErrorTitle: "执行失败",
    checkTriggered: "检查已触发",
    checkTriggeredDesc: "检查已成功触发。",
    triggerFailed: "触发检查失败",
    noScriptsAvailable: "没有可用的检查脚本",
    ensureConfigured: "请确保脚本已正确配置并部署。",
    // History Table
    historyTitle: "历史检查记录",
    historyDesc: "显示最近 %s 次检查的详细结果",
    searchPlaceholder: "搜索脚本名称或消息...",
    clearSearch: "清除",
    filterAll: "全部",
    filterSuccess: "成功",
    filterFailed: "失败",
    tableStatus: "状态",
    tableScriptName: "脚本名称",
    tableExecutionTime: "执行时间",
    tableFindings: "发现/消息",
    tableActions: "操作",
    noMatchingRecords: "暂无匹配的检查记录",
    clearFilters: "清除筛选条件",
    // Row Actions
    collapse: "收起",
    expand: "详情",
    viewDetailsSidebar: "在侧边栏查看详情",
    // Detail View (Sheet & Expanded Row)
    checkDetails: "检查详情",
    executionStatus: "执行状态:",
    executionMessage: "执行消息:",
    findings: "发现:",
    rawResults: "原始查询结果:",
    noRawData: "无原始数据",
    viewGitHubAction: "查看 GitHub Action",
    noMessage: "无消息",
    // Footer
    footerSystem: "SQL 检查系统",
    footerInfo: "自动化检查由 GitHub Actions 驱动，数据存储于 MongoDB。",
    footerTheme: "当前主题: %s",
    previous: "上一页",
    next: "下一页",
    pageInfo: "第 %s 页 / 共 %s 页",
    collapseDetails: "收起详情",
    expandDetails: "展开详情",
    viewInSidebar: "在侧边栏查看",
    // 以下是需要补充的键
    scheduled: "计划中",
    automatic: "自动",
    manual: "手动",
    today: "今天",
    tomorrow: "明天",
    totalChecks: "总检查数",
    checksSucceeded: "成功的检查",
    checksFailed: "失败的检查",
    noResults: "无结果",
    poweredBy: "技术支持",
  },
};
