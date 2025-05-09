import { ExecutionStatusType } from "../../../scripts/types";

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
  | "yesterday"
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
  | "footerTheme"
  | "checksStatistics"
  | "checkPerformanceOverview"
  | "checksDistribution"
  | "resultsShowing"
  | "totalPages"
  | "totalRuns"
  | "successfulRuns"
  | "needsAttention"
  | "addNewScriptButton"
  | "createScriptTitle"
  | "editScriptTitle"
  | "fieldScriptId"
  | "fieldScriptNameEn"
  | "fieldScriptNameCn"
  | "fieldScriptDescriptionEn"
  | "fieldScriptDescriptionCn"
  | "fieldScriptScopeEn"
  | "fieldScriptScopeCn"
  | "fieldScriptAuthor"
  | "fieldSqlContent"
  | "fieldIsScheduled"
  | "fieldCronSchedule"
  | "saveScriptButton"
  | "cancelButton"
  | "deleteScriptButton"
  | "confirmDeleteScriptTitle"
  | "confirmDeleteScriptMessage"
  | "scriptIdPlaceholder"
  | "cronSchedulePlaceholder"
  | "scriptSavedSuccess"
  | "scriptSaveError"
  | "scriptLoadedSuccess"
  | "scriptLoadError"
  | "scriptDeletedSuccess"
  | "scriptDeleteError"
  | "scriptUpdatedSuccess"
  | "scriptUpdateError"
  | "nextScheduledCheck"
  | "refreshingStatusText"
  | "refreshDataButton"
  | "checkHistoryTitle"
  | "footerText"
  | "scriptMetadataTitle"
  | "scriptMetadataDesc"
  | "fillRequiredFieldsError"
  | "invalidScriptIdError"
  | "savingStatusText"
  | "dataAnalysisButton"
  | "dataAnalysisTitle"
  | "backToList"
  | "manageScriptsPageTitle"
  | "manageScriptsPageDescription"
  | "addScriptDialogTitle"
  | "editScriptDialogTitle"
  | "fieldUpdatedAt"
  | "confirmAction"
  | "noScriptsYet"
  | "manageScriptsButton";

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
  statusType?: ExecutionStatusType;
  message: string;
  findings: string;
  raw_results: Record<string, unknown>[];
  github_run_id?: string | number;
}

export interface ScriptInfo {
  scriptId: string;
  name: string;
  description?: string;
  cnName?: string;
  cnDescription?: string;
  scope?: string;
  cnScope?: string;
  author?: string;
  createdAt?: Date;
  isScheduled?: boolean;
  sqlContent?: string;
}

export interface SqlScript {
  _id?: string; // MongoDB ID, optional as it's not present before creation
  scriptId: string;
  name: string;
  cnName?: string;
  description?: string;
  cnDescription?: string;
  scope?: string;
  cnScope?: string;
  author: string;
  sqlContent: string;
  isScheduled?: boolean;
  cronSchedule?: string;
  createdAt?: Date | string; // Allow string for API response, Date for client state
  updatedAt?: Date | string; // Allow string for API response, Date for client state
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
    pageInfo: "Showing %s-%s of %s results (Page %s of %s)",
    collapseDetails: "Collapse details",
    expandDetails: "Expand details",
    viewInSidebar: "View in sidebar",
    // 以下是需要补充的键
    scheduled: "Scheduled",
    automatic: "Automatic",
    manual: "Manual",
    today: "Today",
    tomorrow: "Tomorrow",
    yesterday: "Yesterday",
    totalChecks: "Total Checks",
    checksSucceeded: "Successful Checks",
    checksFailed: "Failed Checks",
    noResults: "No Results",
    poweredBy: "Powered by",
    // 新增键
    checksStatistics: "Check Statistics",
    checkPerformanceOverview: "Performance overview of your SQL checks",
    checksDistribution: "Success/Failure Distribution",
    resultsShowing: "Results",
    totalPages: "Pages",
    totalRuns: "Total Script Runs",
    successfulRuns: "Successful Executions",
    needsAttention: "Needs Attention",
    addNewScriptButton: "Add New Script",
    createScriptTitle: "Create New SQL Script",
    editScriptTitle: "Edit SQL Script",
    fieldScriptId: "Script ID",
    fieldScriptNameEn: "Script Name (EN)",
    fieldScriptNameCn: "Script Name (CN)",
    fieldScriptDescriptionEn: "Description (EN)",
    fieldScriptDescriptionCn: "Description (CN)",
    fieldScriptScopeEn: "Scope (EN)",
    fieldScriptScopeCn: "Scope (CN)",
    fieldScriptAuthor: "Author",
    fieldSqlContent: "SQL Content",
    fieldIsScheduled: "Enable Schedule",
    fieldCronSchedule: "Cron Schedule",
    saveScriptButton: "Save Script",
    cancelButton: "Cancel",
    deleteScriptButton: "Delete Script",
    confirmDeleteScriptTitle: "Confirm Deletion",
    confirmDeleteScriptMessage:
      "Are you sure you want to delete the script '{scriptName}'? This action cannot be undone.",
    scriptIdPlaceholder: "e.g., check-user-activity",
    cronSchedulePlaceholder: "e.g., 0 0 * * * (daily at midnight)",
    scriptSavedSuccess: "Script saved successfully.",
    scriptSaveError: "Failed to save script.",
    scriptLoadedSuccess: "Script loaded successfully.",
    scriptLoadError: "Failed to load script details.",
    scriptDeletedSuccess: "Script deleted successfully.",
    scriptDeleteError: "Failed to delete script.",
    scriptUpdatedSuccess: "Script updated successfully.",
    scriptUpdateError: "Failed to update script.",
    nextScheduledCheck: "Next Scheduled Check",
    refreshingStatusText: "Refreshing...",
    refreshDataButton: "Refresh Data",
    checkHistoryTitle: "Check History",
    footerText: "SQL Check System. All rights reserved.",
    scriptMetadataTitle: "Script Metadata",
    scriptMetadataDesc: "Provide details for the SQL script.",
    fillRequiredFieldsError:
      "Please fill all required fields: Script ID, Name, and SQL Content.",
    invalidScriptIdError:
      "Invalid Script ID format. Use lowercase letters, numbers, and hyphens.",
    savingStatusText: "Saving...",
    // Data Analysis
    dataAnalysisButton: "Data Analysis",
    dataAnalysisTitle: "Data Analysis",
    backToList: "Back to List",
    manageScriptsPageTitle: "Manage Scripts",
    manageScriptsPageDescription:
      "Create, view, update, and delete your SQL scripts from a centralized interface.",
    addScriptDialogTitle: "Add New SQL Script",
    editScriptDialogTitle: "Edit SQL Script",
    fieldUpdatedAt: "Updated At",
    confirmAction: "Confirm Action",
    noScriptsYet: "No scripts found. Get started by adding a new one!",
    manageScriptsButton: "Manage Scripts",
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
    pageInfo: "显示第 %s-%s 条，共 %s 条结果（第 %s 页/共 %s 页）",
    collapseDetails: "收起详情",
    expandDetails: "展开详情",
    viewInSidebar: "在侧边栏查看",
    // 以下是需要补充的键
    scheduled: "计划中",
    automatic: "自动",
    manual: "手动",
    today: "今天",
    tomorrow: "明天",
    yesterday: "昨天",
    totalChecks: "总检查数",
    checksSucceeded: "成功的检查",
    checksFailed: "失败的检查",
    noResults: "无结果",
    poweredBy: "技术支持",
    // 新增键
    checksStatistics: "检查统计",
    checkPerformanceOverview: "SQL检查性能概览",
    checksDistribution: "成功/失败分布",
    resultsShowing: "结果",
    totalPages: "页",
    totalRuns: "脚本总运行次数",
    successfulRuns: "成功执行",
    needsAttention: "需注意",
    addNewScriptButton: "添加新脚本",
    createScriptTitle: "创建新 SQL 脚本",
    editScriptTitle: "编辑 SQL 脚本",
    fieldScriptId: "脚本ID",
    fieldScriptNameEn: "脚本名称 (英文)",
    fieldScriptNameCn: "脚本名称 (中文)",
    fieldScriptDescriptionEn: "描述 (英文)",
    fieldScriptDescriptionCn: "描述 (中文)",
    fieldScriptScopeEn: "范围 (英文)",
    fieldScriptScopeCn: "范围 (中文)",
    fieldScriptAuthor: "作者",
    fieldSqlContent: "SQL 内容",
    fieldIsScheduled: "启用定时任务",
    fieldCronSchedule: "Cron 表达式",
    saveScriptButton: "保存脚本",
    cancelButton: "取消",
    deleteScriptButton: "删除脚本",
    confirmDeleteScriptTitle: "确认删除",
    confirmDeleteScriptMessage:
      "您确定要删除脚本 '{scriptName}' 吗？此操作无法撤销。",
    scriptIdPlaceholder: "例如, check-user-activity",
    cronSchedulePlaceholder: "例如, 0 0 * * * (每天零点)",
    scriptSavedSuccess: "脚本保存成功。",
    scriptSaveError: "脚本保存失败。",
    scriptLoadedSuccess: "脚本加载成功。",
    scriptLoadError: "加载脚本详情失败。",
    scriptDeletedSuccess: "脚本删除成功。",
    scriptDeleteError: "删除脚本失败。",
    scriptUpdatedSuccess: "脚本更新成功。",
    scriptUpdateError: "更新脚本失败。",
    nextScheduledCheck: "下次计划检查",
    refreshingStatusText: "刷新中...",
    refreshDataButton: "刷新数据",
    checkHistoryTitle: "检查历史",
    footerText: "SQL 检查系统。保留所有权利。",
    scriptMetadataTitle: "脚本元数据",
    scriptMetadataDesc: "请提供 SQL 脚本的详细信息。",
    fillRequiredFieldsError: "请填写所有必填项：脚本ID、名称和 SQL 内容。",
    invalidScriptIdError: "无效的脚本ID格式。请使用小写字母、数字和连字符。",
    savingStatusText: "保存中...",
    // Data Analysis
    dataAnalysisButton: "数据分析",
    dataAnalysisTitle: "数据分析",
    backToList: "返回列表",
    manageScriptsPageTitle: "脚本管理",
    manageScriptsPageDescription:
      "从集中界面创建、查看、更新和删除您的 SQL 脚本。",
    addScriptDialogTitle: "添加新 SQL 脚本",
    editScriptDialogTitle: "编辑 SQL 脚本",
    fieldUpdatedAt: "更新于",
    confirmAction: "确认操作",
    noScriptsYet: "暂无脚本，点击“添加新脚本”开始创建吧！",
    manageScriptsButton: "管理脚本",
  },
};
