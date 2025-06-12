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
  | "checkDetails"
  | "noResults"
  | "previous"
  | "next"
  | "pageInfo"
  | "checkTriggered"
  | "checkTriggeredDesc"
  | "triggerFailed"
  | "poweredBy"
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
  | "editScript"
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
  | "deleteButton"
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
  | "backToDashboardButton"
  | "viewFullReportButton"
  | "manageScriptsPageTitle"
  | "manageScriptsPageDescription"
  | "addScriptDialogTitle"
  | "editScriptDialogTitle"
  | "fieldUpdatedAt"
  | "confirmAction"
  | "noScriptsYet"
  | "manageScriptsButton"
  | "scripts"
  | "checkDetailsTitle"
  | "checkDetailsDesc"
  | "fieldCreatedAt"
  | "dataAnalysisSubTitle"
  | "selectAnalysisParamsTitle"
  | "selectAnalysisParamsDesc"
  | "dateRangeLabel"
  | "scriptTypeLabel"
  | "analysisPeriodLabel"
  | "generateReportButton"
  | "analysisResultsTitle"
  | "analysisResultsDesc"
  | "chartPlaceholderTitle"
  | "summaryTablePlaceholderTitle"
  | "noDataForAnalysis"
  | "comingSoonMessage"
  | "selectScriptPlaceholder"
  | "jumpToPage"
  | "pageJump"
  | "jumpToFirst"
  | "jumpToLast"
  | "pageNumber"
  | "of"
  | "pages"
  | "totalChecksExecuted"
  | "successRatePercentage"
  | "noSuccessRecords"
  | "excellentTrend"
  | "goodTrend"
  | "averageTrend"
  | "needsAttentionTrend"
  | "normalTrend"
  | "needsProcessingTrend"
  | "failureRatePercentage"
  | "noFailureRecords"
  | "scriptDetails"
  | "description"
  | "scope"
  | "author"
  | "createdAt"
  | "unknown"
  | "noDataFound"
  | "noMatchingExecutionRecords"
  | "viewAndManageAllRecords"
  | "needsAttentionRatePercentage"
  | "noAttentionRecords"
  | "sqlEditorTitle"
  | "sqlEditorDescription"
  | "codeStatisticsLines"
  | "codeStatisticsChars"
  | "previewMode"
  | "editMode"
  | "formatCode"
  | "formatting"
  | "sqlPreviewLabel"
  | "noCodeContent"
  | "editorStatusReady"
  | "editorHelpText"
  | "formatSuccess"
  | "formatSuccessDesc"
  | "formatError"
  | "formatErrorDesc"
  | "noCodeToFormat"
  | "sqlPlaceholder"
  | "editorHelpTitle"
  | "basicIdentityInfo"
  | "multiLanguageInfo"
  | "englishSection"
  | "chineseSection"
  | "scheduleConfig"
  | "readOnlyField"
  | "editModeLabel"
  | "newModeLabel"
  | "scheduleEnabledDesc"
  | "cronFormatHelp"
  | "timeRangeFilter"
  | "scriptFilter"
  | "allScripts"
  | "last7Days"
  | "last30Days"
  | "last90Days"
  | "allTime"
  | "filterConditions"
  | "totalExecutions"
  | "overallSuccessRate"
  | "successfulExecutions"
  | "failedAttentionExecutions"
  | "executionTrend"
  | "scriptPerformanceAnalysis"
  | "loadingAnalyticsData"
  | "dataLoadFailed"
  | "retryLoad"
  | "noDataInTimeRange"
  | "executionCount"
  | "executionTime"
  | "lastExecution"
  | "excellentPerformance"
  | "goodPerformance"
  | "averagePerformance"
  | "needsAttentionPerformance"
  | "scriptsCount"
  | "executionsLabel"
  | "successLabel"
  | "failedLabel"
  | "attentionLabel"
  | "recentExecution"
  | "earlierExecution"
  | "successRateLabel"
  | "performanceExcellent"
  | "performanceGood"
  | "performanceAverage"
  | "performanceNeedsAttention"
  | "topRanking"
  | "doBlockDetected"
  | "doBlockDetectedDesc"
  | "manualFormatSuggestion"
  | "runAllScripts"
  | "runningAllScripts"
  | "runAllScriptsDesc"
  | "runAllScriptsConfirm"
  | "runAllScriptsConfirmDesc"
  | "batchExecutionStarted"
  | "batchExecutionStartedDesc"
  | "batchExecutionFailed"
  | "scriptsExecutionProgress"
  | "executeSelectedScript"
  | "executeAllScripts"
  | "bulkExecution"
  | "executionMode"
  | "singleExecution"
  | "selectExecutionMode"
  | "searchScripts"
  | "searchScriptsPlaceholder"
  | "scheduledTask"
  | "noMatchingScripts"
  | "scriptsToExecute"
  | "scheduledScripts"
  | "executeAllScriptsOption"
  | "executeAllScriptsDesc"
  | "executeScheduledScriptsOption"
  | "executeScheduledScriptsDesc"
  | "batchExecutionConfirmMessage"
  | "batchExecutionConfirmScheduledMessage"
  | "cancelButton"
  | "batchExecutionProgress"
  | "overallProgress"
  | "total"
  | "running"
  | "pending"
  | "success"
  | "attention"
  | "failed"
  | "batchExecutionCompleted"
  | "batchExecutionCompletedDesc"
  | "cancel"
  | "close"
  | "complete"
  | "needsAttentionShort"
  | "systemTitle"
  | "authorizedAccess"
  | "changeLanguage"
  | "editHistory"
  | "editHistoryTitle"
  | "editHistoryDesc"
  | "viewEditHistory"
  | "allScriptsHistory"
  | "scriptNameFilter"
  | "authorFilter"
  | "operationTypeFilter"
  | "dateRangeFilter"
  | "operationCreate"
  | "operationUpdate"
  | "operationDelete"
  | "operationAll"
  | "noEditHistory"
  | "loadingEditHistory"
  | "editHistoryError"
  | "changesDetails"
  | "originalValue"
  | "newValue"
  | "operationUser"
  | "operationTime"
  | "fieldChanges"
  | "noChanges"
  | "searchEditHistory"
  | "filterEditHistory"
  | "resetFilters"
  | "scriptNameCn"
  | "sortByTime"
  | "sortByScript"
  | "sortByAuthor"
  | "ascending"
  | "descending"
  | "exportEditHistory"
  | "totalChanges"
  | "recentChanges"
  | "editHistoryStats"
  | "from"
  | "to"
  | "editHistoryDescGlobal"
  | "searchHistoryWithFilters"
  | "dateFrom"
  | "dateTo"
  | "errorUnauthorized"
  | "editHistoryErrorUnknown"
  | "noEditHistoryDetail"
  | "unknownScript"
  | "unknownUser"
  | "fieldChangesCount"
  | "editHistoryRecords"
  | "editHistoryDetails"
  | "scriptName"
  | "operationType"
  | "selectOperationPlaceholder"
  | "pageInfoShort"
  | "checkDetails"
  | "tableActions"
  | "themeSettings"
  | "editorThemeSettings"
  | "settingsApplyImmediately"
  | "editorTheme"
  | "fontFamily"
  | "fontSize"
  | "currentSettings"
  | "resetDefaults"
  | "applySettings"
  | "viewExecutionHistory"
  | "executionHistory"
  | "lightMode"
  | "darkMode"
  | "lightTheme"
  | "darkTheme"
  | "themeHelpLight"
  | "themeHelpDark"
  | "fontLabel"
  | "hashtags"
  | "addHashtag"
  | "hashtagsLabel"
  | "hashtagPlaceholder"
  | "removeHashtag"
  | "filterByHashtag"
  | "allHashtags"
  | "noHashtags"
  | "hashtagsFilter"
  | "hashtagFilter"
  | "availableHashtags"
  | "selectHashtags"
  | "hashtagsHelp"
  | "hashtagFormat"
  | "noTagsAvailable"
  | "showAllTags"
  | "allTagsCount"
  | "tagFilterButton"
  | "clearAllTags"
  | "searchTagsPlaceholder"
  | "selectedTagsCount"
  | "availableTagsCount"
  | "noMatchingTags"
  | "noAvailableTags"
  | "dataSourceTitle"
  | "dataSourceDescription"
  | "databaseConnectionError"
  | "checkInProgress"
  | "checkScheduled"
  | "nextScheduledCheck"
  | "successRate"
  | "manualTriggerTitle"
  | "manualTriggerDescription"
  | "selectScriptToRun"
  | "runSelectedScript"
  | "checkHistoryTitle"
  | "checkHistoryDescription"
  | "noChecksYet"
  | "scriptColumn"
  | "statusColumn"
  | "timestampColumn"
  | "messageColumn"
  | "actionColumn"
  | "viewDetails"
  | "success"
  | "failed"
  | "attention_needed"
  | "needsAttention"
  | "loading"
  | "error"
  | "refresh"
  | "refreshDataButton"
  | "refreshingStatusText"
  | "unknownScript"
  | "noDataAvailable"
  | "changeLanguage"
  | "backToDashboardButton"
  | "viewFullReportButton"
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
  | "manageScriptsButton"
  | "checkDetailsTitle"
  | "checkDetailsDesc"
  | "dataAnalysisSubTitle"
  | "selectAnalysisParamsTitle"
  | "selectAnalysisParamsDesc"
  | "dateRangeLabel"
  | "scriptTypeLabel"
  | "analysisPeriodLabel"
  | "generateReportButton"
  | "analysisResultsTitle"
  | "analysisResultsDesc"
  | "chartPlaceholderTitle"
  | "summaryTablePlaceholderTitle"
  | "noDataForAnalysis"
  | "comingSoonMessage"
  | "selectScriptPlaceholder"
  | "jumpToPage"
  | "pageJump"
  | "jumpToFirst"
  | "jumpToLast"
  | "pageNumber"
  | "of"
  | "pages"
  | "totalChecksExecuted"
  | "successRatePercentage"
  | "noSuccessRecords"
  | "excellentTrend"
  | "goodTrend"
  | "averageTrend"
  | "poorTrend"
  | "criticalTrend"
  | "scriptPerformanceAnalysis"
  | "overallSystemAnalysis"
  | "dailyTrendAnalysis"
  | "statusDistributionAnalysis"
  | "statusDistribution"
  | "executionResultsStats"
  | "recent14DaysTrend"
  | "date"
  | "failedExecutions"
  | "filterByHashtag"
  | "filterStatus"
  | "searchScripts"
  | "clearSearch"
  | "allStatuses"
  | "scheduleEnabled"
  | "scheduleDisabled"
  | "hashtagsLabel"
  | "addHashtag"
  | "removeHashtag"
  | "hashtagPlaceholder"
  | "maxHashtagsReached"
  | "invalidHashtagFormat"
  | "hashtagExists"
  | "navigationDashboard"
  | "navigationScripts"
  | "navigationAnalysis"
  | "navigationApprovals"
  | "navigationUsers"
  | "navigationResults"
  | "breadcrumbHome"
  | "breadcrumbScripts"
  | "breadcrumbAnalysis"
  | "breadcrumbResults"
  | "quickExecution"
  | "mode"
  | "selectScript"
  | "dailyAverage"
  | "failureRate"
  | "activeSystem"
  | "moderateActivity"
  | "lowActivity"
  | "todayExecution"
  | "executionDistribution"
  | "noExecutionToday"
  | "total"
  | "approvalsTitle"
  | "approvalsDescription"
  | "pendingApprovals"
  | "approvalHistory"
  | "pendingScripts"
  | "pendingScriptsDesc"
  | "historyScripts"
  | "historyScriptsDesc"
  | "noPendingApprovals"
  | "noApprovalHistory"
  | "requestor"
  | "createdAt"
  | "scriptId"
  | "requestReason"
  | "approvalRecord"
  | "approved"
  | "rejected"
  | "requiredRoles"
  | "progress"
  | "approvalComplete"
  | "pendingApproval"
  | "approve"
  | "reject"
  | "approveScript"
  | "rejectScript"
  | "approvalReason"
  | "approvalReasonPlaceholder"
  | "rejectReasonPlaceholder"
  | "cancel"
  | "scriptType"
  | "loading"
  | "pending"
  | "withdrawn"
  | "draft"
  | "readOnlyQuery"
  | "dataModification"
  | "structureChange"
  | "systemAdmin"
  | "readOnlyDesc"
  | "dataModificationDesc"
  | "structureChangeDesc"
  | "systemAdminDesc"
  | "userManagementTitle"
  | "userManagementDesc"
  | "roleStats"
  | "userList"
  | "addUserRole"
  | "userEmail"
  | "userIdField"
  | "selectRole"
  | "assignRole"
  | "removeRole"
  | "modifyRole"
  | "adminRole"
  | "managerRole"
  | "developerRole"
  | "viewerRole"
  | "adminDesc"
  | "managerDesc"
  | "developerDesc"
  | "viewerDesc"
  | "assignedBy"
  | "assignedAt"
  | "totalUsers";

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
  script_id: string;
  execution_time: string;
  status: (typeof CheckStatus)[keyof typeof CheckStatus];
  statusType?: ExecutionStatusType;
  message: string;
  findings: string;
  raw_results: Record<string, unknown>[];
  github_run_id?: string | number;
  createdAt?: Date | string;
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
  createdAt?: Date | string;
  isScheduled?: boolean;
  cronSchedule?: string;
  sqlContent?: string;
  hashtags?: string[]; // 新增：hashtag数组
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
  hashtags?: string[]; // 新增：hashtag数组
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
    backToDashboardButton: "Back to Dashboard",
    // History Table
    historyTitle: "Check History",
    historyDesc: "Showing results for the last %s checks",
    searchPlaceholder: "Search script name, message, or use #tag...",
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
    viewDetailsSidebar: "View Details in Sidebar",
    viewInSidebar: "View in Sidebar",
    // Detail View (Sheet & Expanded Row)
    checkDetails: "Check Details",
    executionStatus: "Execution Status:",
    executionMessage: "Execution Message:",
    findings: "Findings:",
    rawResults: "Raw Query Results:",
    noRawData: "No raw data",
    viewGitHubAction: "View GitHub Action",
    noMessage: "No message",
    viewFullReportButton: "View Full Report",
    // Footer
    footerSystem: "SQL Check System",
    footerInfo:
      "Automated checks driven by GitHub Actions, data stored in MongoDB.",
    footerTheme: "Current Theme: %s",
    previous: "Previous",
    next: "Next",
    pageInfo: "Showing %s-%s of %s results (Page %s of %s)",
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
    needsAttention: "Attention",
    addNewScriptButton: "Add New Script",
    createScriptTitle: "Create New SQL Script",
    editScriptTitle: "Edit SQL Script",
    editScript: "Edit Script",
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
    deleteScriptButton: "Delete Script",
    deleteButton: "Delete",
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
    fieldCreatedAt: "Created At",
    fieldUpdatedAt: "Updated At",
    confirmAction: "Confirm Action",
    noScriptsYet: "No scripts found. Get started by adding a new one!",
    manageScriptsButton: "Manage Scripts",
    checkDetailsTitle: "Check Details",
    checkDetailsDesc:
      "Details for script {scriptId}, executed at {executionTime}.",
    dataAnalysisSubTitle:
      "Explore trends and insights from your script execution data.",
    selectAnalysisParamsTitle: "Analysis Parameters",
    selectAnalysisParamsDesc: "Filter data to refine your analysis.",
    dateRangeLabel: "Date Range",
    scriptTypeLabel: "Script Type",
    analysisPeriodLabel: "Analysis Period",
    generateReportButton: "Generate Report",
    analysisResultsTitle: "Analysis Results",
    analysisResultsDesc: "Visualizations and summaries will appear here.",
    chartPlaceholderTitle: "Performance Trend (Placeholder)",
    summaryTablePlaceholderTitle: "Key Metrics Summary (Placeholder)",
    noDataForAnalysis:
      "No data available for analysis under the current criteria.",
    comingSoonMessage:
      "More detailed analysis features are coming soon! Stay tuned.",
    selectScriptPlaceholder: "Select a script to run",
    jumpToPage: "Jump",
    pageJump: "Go",
    jumpToFirst: "Jump to first page",
    jumpToLast: "Jump to last page",
    pageNumber: "Page",
    of: "of",
    pages: "pages",
    totalChecksExecuted: "Total Checks Executed",
    successRatePercentage: "Success Rate Percentage",
    noSuccessRecords: "No Success Records",
    excellentTrend: "Excellent Trend",
    goodTrend: "Good Trend",
    averageTrend: "Average Trend",
    needsAttentionTrend: "Needs Attention Trend",
    normalTrend: "Normal Trend",
    needsProcessingTrend: "Needs Processing Trend",
    failureRatePercentage: "Failure Rate Percentage",
    noFailureRecords: "No Failure Records",
    scriptDetails: "Script Details",
    description: "Description",
    scope: "Scope",
    author: "Author",
    createdAt: "Created At",
    unknown: "Unknown",
    noDataFound: "No Data Found",
    noMatchingExecutionRecords: "No Matching Execution Records",
    viewAndManageAllRecords: "View and Manage All Records",
    needsAttentionRatePercentage: "Needs Attention Rate Percentage",
    noAttentionRecords: "No Attention Records",
    scripts: "Scripts",
    // 新增的CodeMirror编辑器相关翻译
    sqlEditorTitle: "SQL Editor",
    sqlEditorDescription: "Write and format your SQL queries",
    codeStatisticsLines: "lines",
    codeStatisticsChars: "characters",
    previewMode: "Preview",
    editMode: "Edit",
    formatCode: "Format",
    formatting: "Formatting...",
    sqlPreviewLabel: "SQL Preview",
    noCodeContent: "No code content...",
    editorStatusReady: "SQL",
    editorHelpText:
      "Use Ctrl+A to select all, Ctrl+Z to undo. Click the Format button to automatically organize SQL code format.",
    formatSuccess: "SQL code formatted successfully",
    formatSuccessDesc: "Code has been rearranged according to standard format",
    formatError: "Formatting failed",
    formatErrorDesc: "Please check if the SQL syntax is correct",
    noCodeToFormat: "No code to format",
    sqlPlaceholder:
      "-- Enter your SQL query here\n-- Example: SELECT * FROM users WHERE active = true;",
    editorHelpTitle: "Tips:",
    // 新增的ScriptMetadataForm相关翻译
    basicIdentityInfo: "Basic Identity Information",
    multiLanguageInfo: "Multi-language Information",
    englishSection: "English",
    chineseSection: "Chinese",
    scheduleConfig: "Schedule Configuration",
    readOnlyField: "Read Only",
    editModeLabel: "Edit Mode",
    newModeLabel: "New Mode",
    scheduleEnabledDesc:
      "When enabled, the script will be executed automatically according to the specified schedule",
    cronFormatHelp:
      "Use Cron format: minute hour day month weekday (e.g., 0 9 * * 1-5 means weekdays at 9 AM)",
    // 数据分析页面相关翻译
    timeRangeFilter: "Time Range Filter",
    scriptFilter: "Script Filter",
    allScripts: "All Scripts",
    last7Days: "Last 7 Days",
    last30Days: "Last 30 Days",
    last90Days: "Last 90 Days",
    allTime: "All Time",
    filterConditions: "Filter Conditions",
    totalExecutions: "Total Executions",
    overallSuccessRate: "Overall Success Rate",
    successfulExecutions: "Successful Executions",
    failedAttentionExecutions: "Failed/Attention Executions",
    executionTrend: "Execution Trend",
    scriptPerformanceAnalysis: "Script Performance Analysis",
    loadingAnalyticsData: "Loading Analytics Data",
    dataLoadFailed: "Data Load Failed",
    retryLoad: "Retry Load",
    noDataInTimeRange: "No Data in Time Range",
    executionCount: "Execution Count",
    executionTime: "Execution Time",
    lastExecution: "Last Execution",
    excellentPerformance: "Excellent Performance",
    goodPerformance: "Good Performance",
    averagePerformance: "Average Performance",
    needsAttentionPerformance: "Needs Attention Performance",
    scriptsCount: "Scripts Count",
    executionsLabel: "Executions",
    successLabel: "Success",
    failedLabel: "Failed",
    attentionLabel: "Attention",
    recentExecution: "Recent Execution",
    earlierExecution: "Earlier Execution",
    successRateLabel: "Success Rate",
    performanceExcellent: "Excellent Performance",
    performanceGood: "Good Performance",
    performanceAverage: "Average Performance",
    performanceNeedsAttention: "Needs Attention Performance",
    topRanking: "Top Ranking",
    // DO$$相关翻译键
    doBlockDetected: "PostgreSQL DO Block Detected",
    doBlockDetectedDesc:
      "DO$$ blocks require manual formatting. Please format the code inside $$ blocks manually for better readability.",
    manualFormatSuggestion: "Manual formatting recommended for DO blocks",
    // 批量执行脚本相关翻译键
    runAllScripts: "Run All Scripts",
    runningAllScripts: "Running All Scripts",
    runAllScriptsDesc: "Run all scripts in the selected execution mode",
    runAllScriptsConfirm: "Confirm Run All Scripts",
    runAllScriptsConfirmDesc: "Are you sure you want to run all scripts?",
    batchExecutionStarted: "Batch Execution Started",
    batchExecutionStartedDesc: "Batch execution started successfully",
    batchExecutionFailed: "Batch Execution Failed",
    scriptsExecutionProgress: "Scripts Execution Progress",
    executeSelectedScript: "Execute Selected Script",
    executeAllScripts: "Execute All Scripts",
    bulkExecution: "Bulk Execution",
    executionMode: "Execution Mode",
    singleExecution: "Single Execution",
    selectExecutionMode: "Select Execution Mode",
    // 新增补充的双语翻译键
    searchScripts: "Search Scripts",
    searchScriptsPlaceholder: "Search script name, description or ID...",
    scheduledTask: "Scheduled Task",
    noMatchingScripts: "No matching scripts found",
    scriptsToExecute: "Scripts to Execute",
    scheduledScripts: "Scheduled Scripts",
    executeAllScriptsOption: "Execute All Scripts",
    executeAllScriptsDesc:
      "Execute all available scripts, including scheduled and manual scripts",
    executeScheduledScriptsOption: "Execute Scheduled Scripts Only",
    executeScheduledScriptsDesc: "Execute only scripts with scheduling enabled",
    batchExecutionConfirmMessage: "将执行 {count} 个脚本。",
    batchExecutionConfirmScheduledMessage: "将执行 {count} 个定时脚本。",
    cancelButton: "Cancel",
    // Redis缓存和批量执行进度相关翻译键
    batchExecutionProgress: "Batch Execution Progress",
    overallProgress: "Overall Progress",
    running: "Running",
    pending: "Pending",
    success: "Success",
    attention: "Attention",
    failed: "Failed",
    batchExecutionCompleted: "Batch execution completed!",
    batchExecutionCompletedDesc:
      "Success: {success}, Attention: {attention}, Failed: {failed}",
    cancel: "Cancel",
    close: "Close",
    complete: "Complete",
    needsAttentionShort: "Attention",
    // UserHeader相关翻译键
    systemTitle: "SQL Check System",
    authorizedAccess: "Authorized Access",
    changeLanguage: "Change Language",
    // 编辑历史相关翻译键
    editHistory: "Edit History",
    editHistoryTitle: "Edit History",
    editHistoryDesc: "Showing edit history for the selected script",
    viewEditHistory: "View Edit History",
    allScriptsHistory: "All Scripts Edit History",
    scriptNameFilter: "Script Name Filter",
    authorFilter: "Author Filter",
    operationTypeFilter: "Operation Type Filter",
    dateRangeFilter: "Date Range Filter",
    operationCreate: "Create",
    operationUpdate: "Update",
    operationDelete: "Delete",
    operationAll: "All",
    noEditHistory: "No edit history found",
    loadingEditHistory: "Loading edit history...",
    editHistoryError: "Error loading edit history",
    changesDetails: "Changes Details",
    originalValue: "Original Value",
    newValue: "New Value",
    operationUser: "Operation User",
    operationTime: "Operation Time",
    fieldChanges: "Field Changes",
    noChanges: "No changes",
    searchEditHistory: "Search Edit History",
    filterEditHistory: "Filter Edit History",
    resetFilters: "Reset Filters",
    scriptNameCn: "Script Name (CN)",
    sortByTime: "Sort by Time",
    sortByScript: "Sort by Script",
    sortByAuthor: "Sort by Author",
    ascending: "Ascending",
    descending: "Descending",
    exportEditHistory: "Export Edit History",
    totalChanges: "Total Changes",
    recentChanges: "Recent Changes",
    editHistoryStats: "Edit History Stats",
    from: "From",
    to: "To",
    editHistoryDescGlobal: "View and filter the edit history of all scripts.",
    searchHistoryWithFilters: "Filter Script Edit History",
    dateFrom: "Date From",
    dateTo: "Date To",
    errorUnauthorized: "Unauthorized. Please log in.",
    editHistoryErrorUnknown:
      "An unknown error occurred while fetching edit history.",
    noEditHistoryDetail:
      "Try adjusting your filters or perform some script operations to see history.",
    unknownScript: "Unknown Script",
    unknownUser: "Unknown User",
    fieldChangesCount: "{count} changes",
    editHistoryRecords: "edit history records",
    editHistoryDetails: "Edit History Details",
    scriptName: "Script Name",
    operationType: "Operation Type",
    selectOperationPlaceholder: "Select an operation type",
    pageInfoShort: "Showing %s-%s of %s results (Page %s of %s)",
    // 新增主题设置相关翻译键
    themeSettings: "Theme Settings",
    editorThemeSettings: "Editor Theme Settings",
    settingsApplyImmediately: "Settings Apply Immediately",
    editorTheme: "Editor Theme",
    fontFamily: "Font Family",
    fontSize: "Font Size",
    currentSettings: "Current Settings",
    resetDefaults: "Reset Defaults",
    applySettings: "Apply Settings",
    // 新增执行历史跳转相关翻译键
    viewExecutionHistory: "View Execution History",
    executionHistory: "Execution History",
    // 新增主题模式相关翻译键
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    lightTheme: "Light Theme",
    darkTheme: "Dark Theme",
    themeHelpLight:
      "Light themes are available in light mode, switch to dark mode to view dark themes",
    themeHelpDark:
      "Dark themes are available in dark mode, switch to light mode to view light themes",
    fontLabel: "Font",
    // Hashtag相关翻译键
    hashtags: "Tags",
    addHashtag: "Add Tag",
    hashtagsLabel: "Tags",
    hashtagPlaceholder: "Enter tags...",
    removeHashtag: "Remove Tag",
    filterByHashtag: "Filter by Tag",
    allHashtags: "All Tags",
    noHashtags: "No Tags",
    hashtagsFilter: "Tag Filter",
    hashtagFilter: "Tag Filter",
    availableHashtags: "Available Tags",
    selectHashtags: "Select Tags",
    hashtagsHelp: "Enter multiple tags, separated by commas",
    hashtagFormat: "Tag Format",
    // 新增的UI组件相关翻译键
    noTagsAvailable: "No tags",
    showAllTags: "Show all tags",
    allTagsCount: "All tags ({count})",
    tagFilterButton: "Tag Filter",
    clearAllTags: "Clear All",
    searchTagsPlaceholder: "Search tags...",
    selectedTagsCount: "Selected ({count})",
    availableTagsCount: "Available tags ({count})",
    noMatchingTags: "No matching tags found",
    noAvailableTags: "No available tags",
    navigationDashboard: "Dashboard",
    navigationScripts: "Scripts",
    navigationAnalysis: "Analysis",
    navigationApprovals: "Approvals",
    navigationUsers: "User Management",
    navigationResults: "Results",
    breadcrumbHome: "Home",
    breadcrumbScripts: "Scripts",
    breadcrumbAnalysis: "Analysis",
    breadcrumbResults: "Results",
    // 缺失的基础字段
    error: "Error",
    attention_needed: "Attention Needed",
    dataSourceTitle: "Data Source",
    dataSourceDescription: "Database connection and data source information",
    databaseConnectionError: "Database Connection Error",
    checkInProgress: "Check in Progress",
    checkScheduled: "Check Scheduled",
    manualTriggerTitle: "Manual Trigger",
    manualTriggerDescription: "Manually trigger script execution",
    selectScriptToRun: "Select Script to Run",
    runSelectedScript: "Run Selected Script",
    checkHistoryDescription: "View history of all check executions",
    noChecksYet: "No checks performed yet",
    scriptColumn: "Script",
    statusColumn: "Status",
    timestampColumn: "Timestamp",
    messageColumn: "Message",
    actionColumn: "Action",
    viewDetails: "View Details",
    noDataAvailable: "No Data Available",
    poorTrend: "Poor Trend",
    criticalTrend: "Critical Trend",
    overallSystemAnalysis: "Overall System Analysis",
    dailyTrendAnalysis: "Daily Trend Analysis",
    statusDistributionAnalysis: "Status Distribution Analysis",
    statusDistribution: "Status Distribution",
    executionResultsStats: "Execution Results Statistics",
    recent14DaysTrend: "Recent 14 Days Trend",
    date: "Date",
    failedExecutions: "Failed Executions",
    allStatuses: "All Statuses",
    scheduleEnabled: "Schedule Enabled",
    scheduleDisabled: "Schedule Disabled",
    maxHashtagsReached: "Maximum hashtags reached",
    invalidHashtagFormat: "Invalid hashtag format",
    hashtagExists: "Hashtag already exists",
    filterStatus: "Filter Status",
    // 紧凑模式相关翻译
    quickExecution: "Quick Execution",
    mode: "Mode",
    selectScript: "Select Script",
    dailyAverage: "Daily Average",
    failureRate: "Failure Rate",
    activeSystem: "Active System",
    moderateActivity: "Moderate Activity",
    lowActivity: "Low Activity",
    todayExecution: "Today's Execution",
    executionDistribution: "Execution Distribution",
    noExecutionToday: "No executions today",
    total: "Total",
    // Approvals page translations
    approvalsTitle: "Approval Management",
    approvalsDescription:
      "Manage script approval workflows and view approval history",
    pendingApprovals: "Pending Approvals",
    approvalHistory: "Approval History",
    pendingScripts: "Pending Scripts",
    pendingScriptsDesc: "Scripts that require your approval",
    historyScripts: "Approval History",
    historyScriptsDesc: "Completed approval records",
    noPendingApprovals: "No pending approvals",
    noApprovalHistory: "No approval history",
    requestor: "Requestor",
    scriptId: "Script ID",
    requestReason: "Request Reason",
    approvalRecord: "Approval Record",
    approved: "Approved",
    rejected: "Rejected",
    requiredRoles: "Required Roles",
    progress: "Progress",
    approvalComplete: "Approval Complete",
    pendingApproval: "Pending Approval",
    approve: "Approve",
    reject: "Reject",
    approveScript: "Approve Script",
    rejectScript: "Reject Script",
    approvalReason: "Approval Reason (Optional)",
    approvalReasonPlaceholder: "Please enter the reason for approval...",
    rejectReasonPlaceholder: "Please enter the reason for rejection...",
    scriptType: "Script Type",
    withdrawn: "Withdrawn",
    draft: "Draft",
    readOnlyQuery: "Read-Only Query",
    dataModification: "Data Modification",
    structureChange: "Structure Change",
    systemAdmin: "System Admin",
    readOnlyDesc: "Read-only queries, no modifications",
    dataModificationDesc: "Modify data in tables",
    structureChangeDesc: "Modify table structure or indexes",
    systemAdminDesc: "System-level administrative operations",
    // User management page translations
    userManagementTitle: "User Management",
    userManagementDesc: "Manage user roles and permissions",
    roleStats: "Role Statistics",
    userList: "User List",
    addUserRole: "Add User Role",
    userEmail: "User Email",
    userIdField: "User ID",
    selectRole: "Select Role",
    assignRole: "Assign Role",
    removeRole: "Remove Role",
    modifyRole: "Modify Role",
    adminRole: "System Administrator",
    managerRole: "Project Manager",
    developerRole: "Developer",
    viewerRole: "Viewer",
    adminDesc: "Full system access, user and system management",
    managerDesc: "Script management, approval operations, role assignment",
    developerDesc: "Create, edit, and execute scripts",
    viewerDesc: "Read-only access to scripts and execution history",
    assignedBy: "Assigned By",
    assignedAt: "Assigned At",
    totalUsers: "Total Users",
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
    searchPlaceholder: "搜索脚本名称、消息或使用 #标签...",
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
    viewDetailsSidebar: "在侧边栏查看详情",
    viewInSidebar: "在侧边栏查看详情",
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
    needsAttention: "注意",
    addNewScriptButton: "添加新脚本",
    createScriptTitle: "创建新 SQL 脚本",
    editScriptTitle: "编辑 SQL 脚本",
    editScript: "编辑脚本",
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
    fieldCreatedAt: "创建时间",
    fieldCronSchedule: "Cron 表达式",
    saveScriptButton: "保存脚本",
    deleteScriptButton: "删除脚本",
    deleteButton: "删除",
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
    backToDashboardButton: "返回仪表盘",
    viewFullReportButton: "查看完整报告",
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
    noScriptsYet: "暂无脚本，点击 添加新脚本 开始创建吧！",
    manageScriptsButton: "管理脚本",
    checkDetailsTitle: "检查详情",
    checkDetailsDesc: "脚本 {scriptId} 的详情，执行于 {executionTime}。",
    dataAnalysisSubTitle: "探索脚本执行数据的趋势和洞察。",
    selectAnalysisParamsTitle: "分析参数",
    selectAnalysisParamsDesc: "筛选数据以优化您的分析。",
    dateRangeLabel: "日期范围",
    scriptTypeLabel: "脚本类型",
    analysisPeriodLabel: "分析周期",
    generateReportButton: "生成报告",
    analysisResultsTitle: "分析结果",
    analysisResultsDesc: "图表和数据摘要将在此处显示。",
    chartPlaceholderTitle: "性能趋势图 (占位符)",
    summaryTablePlaceholderTitle: "关键指标摘要 (占位符)",
    noDataForAnalysis: "当前条件下无可用数据进行分析。",
    comingSoonMessage: "更多详细的分析功能即将推出！敬请期待。",
    selectScriptPlaceholder: "请选择要运行的脚本",
    jumpToPage: "跳转",
    pageJump: "跳转",
    jumpToFirst: "跳转到首页",
    jumpToLast: "跳转到末页",
    pageNumber: "第",
    of: "/",
    pages: "页",
    totalChecksExecuted: "检查执行总次数",
    successRatePercentage: "成功率",
    noSuccessRecords: "暂无成功记录",
    excellentTrend: "优秀",
    goodTrend: "良好",
    averageTrend: "一般",
    needsAttentionTrend: "需要关注",
    normalTrend: "正常",
    needsProcessingTrend: "需要处理",
    failureRatePercentage: "失败率",
    noFailureRecords: "暂无失败记录",
    scriptDetails: "脚本详情",
    description: "描述",
    scope: "范围",
    author: "作者",
    createdAt: "创建时间",
    unknown: "未知",
    noDataFound: "无数据",
    noMatchingExecutionRecords: "无匹配执行记录",
    viewAndManageAllRecords: "查看和管理所有记录",
    needsAttentionRatePercentage: "需要关注率",
    noAttentionRecords: "无关注记录",
    scripts: "个脚本",
    // 新增的CodeMirror编辑器相关翻译
    sqlEditorTitle: "SQL 编辑器",
    sqlEditorDescription: "编写和格式化您的 SQL 查询",
    codeStatisticsLines: "行",
    codeStatisticsChars: "字符",
    previewMode: "预览",
    editMode: "编辑",
    formatCode: "格式化",
    formatting: "格式化中...",
    sqlPreviewLabel: "SQL 预览",
    noCodeContent: "暂无代码内容...",
    editorStatusReady: "SQL",
    editorHelpText:
      "使用 Ctrl+A 全选，Ctrl+Z 撤销。点击格式化按钮可以自动整理 SQL 代码格式。",
    formatSuccess: "SQL 代码格式化成功",
    formatSuccessDesc: "代码已按照标准格式重新排列",
    formatError: "格式化失败",
    formatErrorDesc: "请检查SQL语法是否正确",
    noCodeToFormat: "没有代码需要格式化",
    sqlPlaceholder:
      "-- 在此输入您的 SQL 查询语句\n-- 例如：SELECT * FROM users WHERE active = true;",
    editorHelpTitle: "提示:",
    // 新增的ScriptMetadataForm相关翻译
    basicIdentityInfo: "基础标识信息",
    multiLanguageInfo: "多语言信息",
    englishSection: "English",
    chineseSection: "中文",
    scheduleConfig: "调度配置",
    readOnlyField: "只读",
    editModeLabel: "编辑模式",
    newModeLabel: "新建模式",
    scheduleEnabledDesc: "启用后，脚本将按照指定的时间表自动执行",
    cronFormatHelp:
      "使用 Cron 格式: 分 时 日 月 周 (例如: 0 9 * * 1-5 表示工作日上午9点)",
    // 数据分析页面相关翻译
    timeRangeFilter: "时间范围过滤器",
    scriptFilter: "脚本过滤器",
    allScripts: "所有脚本",
    last7Days: "最近7天",
    last30Days: "最近30天",
    last90Days: "最近90天",
    allTime: "全部时间",
    filterConditions: "过滤条件",
    totalExecutions: "总执行次数",
    overallSuccessRate: "总体成功率",
    successfulExecutions: "成功执行次数",
    failedAttentionExecutions: "失败/关注执行次数",
    executionTrend: "执行趋势",
    scriptPerformanceAnalysis: "脚本性能分析",
    loadingAnalyticsData: "加载分析数据",
    dataLoadFailed: "数据加载失败",
    retryLoad: "重试加载",
    noDataInTimeRange: "时间范围内无数据",
    executionCount: "执行次数",
    executionTime: "执行时间",
    lastExecution: "上次执行",
    excellentPerformance: "优秀性能",
    goodPerformance: "良好性能",
    averagePerformance: "平均性能",
    needsAttentionPerformance: "需要关注性能",
    scriptsCount: "脚本数量",
    executionsLabel: "执行次数",
    successLabel: "成功",
    failedLabel: "失败",
    attentionLabel: "关注",
    recentExecution: "最近执行",
    earlierExecution: "较早执行",
    successRateLabel: "成功率",
    performanceExcellent: "优秀性能",
    performanceGood: "良好性能",
    performanceAverage: "平均性能",
    performanceNeedsAttention: "需要关注性能",
    topRanking: "Top Ranking",
    // DO$$相关翻译键
    doBlockDetected: "检测到PostgreSQL DO块",
    doBlockDetectedDesc:
      "DO$$块需要手动格式化。请手动整理$$块内部的代码以提高可读性。",
    manualFormatSuggestion: "建议手动格式化DO块",
    // 批量执行脚本相关翻译键
    runAllScripts: "运行所有脚本",
    runningAllScripts: "运行所有脚本",
    runAllScriptsDesc: "运行所有脚本在选定的执行模式下",
    runAllScriptsConfirm: "确认运行所有脚本",
    runAllScriptsConfirmDesc: "您确定要运行所有脚本吗？",
    batchExecutionStarted: "批量执行开始",
    batchExecutionStartedDesc: "批量执行成功开始",
    batchExecutionFailed: "批量执行失败",
    scriptsExecutionProgress: "脚本执行进度",
    executeSelectedScript: "执行选定脚本",
    executeAllScripts: "执行所有脚本",
    bulkExecution: "批量执行",
    executionMode: "执行模式",
    singleExecution: "单次执行",
    selectExecutionMode: "选择执行模式",
    // 新增补充的双语翻译键
    searchScripts: "搜索脚本",
    searchScriptsPlaceholder: "搜索脚本名称、描述或ID...",
    scheduledTask: "定时任务",
    noMatchingScripts: "未找到匹配的脚本",
    scriptsToExecute: "将要执行的脚本",
    scheduledScripts: "定时任务脚本",
    executeAllScriptsOption: "执行所有脚本",
    executeAllScriptsDesc: "执行所有可用的脚本，包括定时和手动脚本",
    executeScheduledScriptsOption: "仅执行定时脚本",
    executeScheduledScriptsDesc: "仅执行启用了定时任务的脚本",
    batchExecutionConfirmMessage: "将执行 {count} 个脚本。",
    batchExecutionConfirmScheduledMessage: "将执行 {count} 个定时脚本。",
    cancelButton: "取消",
    // Redis缓存和批量执行进度相关翻译键
    batchExecutionProgress: "批量执行进度",
    overallProgress: "整体进度",
    running: "执行中",
    pending: "等待",
    success: "成功",
    attention: "关注",
    failed: "失败",
    batchExecutionCompleted: "批量执行完成！",
    batchExecutionCompletedDesc:
      "成功: {success}, 需要关注: {attention}, 失败: {failed}",
    cancel: "取消",
    close: "关闭",
    complete: "完成",
    needsAttentionShort: "关注",
    // UserHeader相关翻译键
    systemTitle: "SQL脚本管理系统",
    authorizedAccess: "已授权访问",
    changeLanguage: "切换语言",
    // 编辑历史相关翻译键
    editHistory: "编辑历史",
    editHistoryTitle: "编辑历史",
    editHistoryDesc: "显示所选脚本的编辑历史",
    viewEditHistory: "查看编辑历史",
    allScriptsHistory: "所有脚本历史",
    scriptNameFilter: "脚本名称过滤器",
    authorFilter: "作者过滤器",
    operationTypeFilter: "操作类型过滤器",
    dateRangeFilter: "日期范围过滤器",
    operationCreate: "创建",
    operationUpdate: "更新",
    operationDelete: "删除",
    operationAll: "全部",
    noEditHistory: "没有编辑历史",
    loadingEditHistory: "加载编辑历史...",
    editHistoryError: "加载编辑历史失败",
    changesDetails: "更改详情",
    originalValue: "原始值",
    newValue: "新值",
    operationUser: "操作用户",
    operationTime: "操作时间",
    fieldChanges: "字段更改",
    noChanges: "没有更改",
    searchEditHistory: "搜索编辑历史",
    filterEditHistory: "过滤编辑历史",
    resetFilters: "重置过滤器",
    scriptNameCn: "脚本名称 (中文)",
    sortByTime: "按时间排序",
    sortByScript: "按脚本排序",
    sortByAuthor: "按作者排序",
    ascending: "升序",
    descending: "降序",
    exportEditHistory: "导出编辑历史",
    totalChanges: "总变更数",
    recentChanges: "最近变更",
    editHistoryStats: "编辑历史统计",
    from: "从",
    to: "至",
    editHistoryDescGlobal: "查看和筛选所有脚本的编辑历史。",
    searchHistoryWithFilters: "筛选脚本编辑历史",
    dateFrom: "起始日期",
    dateTo: "结束日期",
    errorUnauthorized: "未授权。请登录。",
    editHistoryErrorUnknown: "获取编辑历史时发生未知错误。",
    noEditHistoryDetail: "尝试调整筛选条件或执行一些脚本操作以查看历史记录。",
    unknownScript: "未知脚本",
    unknownUser: "未知用户",
    fieldChangesCount: "{count} 项变更",
    editHistoryRecords: "个编辑历史记录",
    editHistoryDetails: "编辑历史详情",
    scriptName: "脚本名称",
    operationType: "操作类型",
    selectOperationPlaceholder: "请选择操作类型",
    pageInfoShort: "显示第 %s-%s 条，共 %s 条结果（第 %s 页/共 %s 页）",
    // 新增主题设置相关翻译键
    themeSettings: "主题设置",
    editorThemeSettings: "编辑器主题设置",
    settingsApplyImmediately: "设置立即应用",
    editorTheme: "编辑器主题",
    fontFamily: "字体",
    fontSize: "字体大小",
    currentSettings: "当前设置",
    resetDefaults: "重置默认值",
    applySettings: "应用设置",
    // 新增执行历史跳转相关翻译键
    viewExecutionHistory: "查看执行历史",
    executionHistory: "执行历史",
    // 新增主题模式相关翻译键
    lightMode: "浅色模式",
    darkMode: "暗色模式",
    lightTheme: "浅色主题",
    darkTheme: "暗色主题",
    themeHelpLight: "浅色模式下可选择浅色主题，切换到暗色模式可查看暗色主题",
    themeHelpDark: "暗色模式下可选择暗色主题，切换到浅色模式可查看浅色主题",
    fontLabel: "字体",
    // Hashtag相关翻译键
    hashtags: "标签",
    addHashtag: "添加标签",
    hashtagsLabel: "标签",
    hashtagPlaceholder: "输入标签",
    removeHashtag: "移除标签",
    filterByHashtag: "按标签过滤",
    allHashtags: "所有标签",
    noHashtags: "无标签",
    hashtagsFilter: "标签过滤器",
    hashtagFilter: "标签过滤器",
    availableHashtags: "可用标签",
    selectHashtags: "选择标签",
    hashtagsHelp: "输入多个标签，用逗号分隔",
    hashtagFormat: "标签格式",
    // 新增的UI组件相关翻译键
    noTagsAvailable: "无标签",
    showAllTags: "显示所有标签",
    allTagsCount: "所有标签 ({count})",
    tagFilterButton: "标签筛选",
    clearAllTags: "清除全部",
    searchTagsPlaceholder: "搜索标签...",
    selectedTagsCount: "已选择 ({count})",
    availableTagsCount: "可选标签 ({count})",
    noMatchingTags: "未找到匹配的标签",
    noAvailableTags: "暂无可用标签",
    navigationDashboard: "仪表盘",
    navigationScripts: "脚本",
    navigationAnalysis: "分析",
    navigationApprovals: "审批管理",
    navigationUsers: "用户管理",
    navigationResults: "结果",
    breadcrumbHome: "首页",
    breadcrumbScripts: "脚本",
    breadcrumbAnalysis: "分析",
    breadcrumbResults: "结果",
    // 缺失的基础字段 - 中文版本
    error: "错误",
    attention_needed: "需要关注",
    dataSourceTitle: "数据源",
    dataSourceDescription: "数据库连接和数据源信息",
    databaseConnectionError: "数据库连接错误",
    checkInProgress: "检查进行中",
    checkScheduled: "检查已计划",
    manualTriggerTitle: "手动触发",
    manualTriggerDescription: "手动触发脚本执行",
    selectScriptToRun: "选择要运行的脚本",
    runSelectedScript: "运行选定的脚本",
    checkHistoryDescription: "查看所有检查执行的历史记录",
    noChecksYet: "还没有执行过检查",
    scriptColumn: "脚本",
    statusColumn: "状态",
    timestampColumn: "时间戳",
    messageColumn: "消息",
    actionColumn: "操作",
    viewDetails: "查看详情",
    noDataAvailable: "无可用数据",
    poorTrend: "不良趋势",
    criticalTrend: "严重趋势",
    overallSystemAnalysis: "整体系统分析",
    dailyTrendAnalysis: "日趋势分析",
    statusDistributionAnalysis: "状态分布分析",
    statusDistribution: "状态分布",
    executionResultsStats: "执行结果统计",
    recent14DaysTrend: "最近14天趋势",
    date: "日期",
    failedExecutions: "失败执行",
    allStatuses: "所有状态",
    scheduleEnabled: "定时任务启用",
    scheduleDisabled: "定时任务禁用",
    maxHashtagsReached: "已达到最大标签数量",
    invalidHashtagFormat: "标签格式无效",
    hashtagExists: "标签已存在",
    filterStatus: "过滤状态",
    // 紧凑模式相关翻译
    quickExecution: "快速执行",
    mode: "模式",
    selectScript: "选择脚本",
    dailyAverage: "日均执行",
    failureRate: "失败率",
    activeSystem: "系统活跃",
    moderateActivity: "适度活跃",
    lowActivity: "活跃度低",
    todayExecution: "今日执行",
    executionDistribution: "执行分布",
    noExecutionToday: "今日暂无执行",
    total: "总计",
    // 审批页面翻译
    approvalsTitle: "审批管理",
    approvalsDescription: "管理脚本审批流程和查看审批历史",
    pendingApprovals: "待审批",
    approvalHistory: "审批历史",
    pendingScripts: "待审批脚本",
    pendingScriptsDesc: "需要您审批的脚本列表",
    historyScripts: "审批历史",
    historyScriptsDesc: "已完成的审批记录",
    noPendingApprovals: "暂无待审批脚本",
    noApprovalHistory: "暂无审批历史",
    requestor: "申请人",
    scriptId: "脚本ID",
    requestReason: "申请理由",
    approvalRecord: "审批记录",
    approved: "已批准",
    rejected: "已拒绝",
    requiredRoles: "需要审批角色",
    progress: "进度",
    approvalComplete: "审批完成",
    pendingApproval: "待审批",
    approve: "批准",
    reject: "拒绝",
    approveScript: "批准脚本",
    rejectScript: "拒绝脚本",
    approvalReason: "批准理由（可选）",
    approvalReasonPlaceholder: "请输入批准的理由...",
    rejectReasonPlaceholder: "请输入拒绝的理由...",
    scriptType: "脚本类型",
    withdrawn: "已撤回",
    draft: "草稿",
    readOnlyQuery: "只读查询",
    dataModification: "数据修改",
    structureChange: "结构变更",
    systemAdmin: "系统管理",
    readOnlyDesc: "仅读取数据，不进行修改",
    dataModificationDesc: "修改表中的数据",
    structureChangeDesc: "修改表结构或索引",
    systemAdminDesc: "系统级别的管理操作",
    // 用户管理页面翻译
    userManagementTitle: "用户管理",
    userManagementDesc: "管理用户角色和权限",
    roleStats: "角色统计",
    userList: "用户列表",
    addUserRole: "添加用户角色",
    userEmail: "用户邮箱",
    userIdField: "用户ID",
    selectRole: "选择角色",
    assignRole: "分配角色",
    removeRole: "删除角色",
    modifyRole: "修改角色",
    adminRole: "系统管理员",
    managerRole: "项目经理",
    developerRole: "开发者",
    viewerRole: "查看者",
    adminDesc: "拥有所有权限，可管理用户、系统设置",
    managerDesc: "可管理脚本、审批操作、分配角色",
    developerDesc: "可创建、编辑、执行脚本",
    viewerDesc: "只能查看脚本和执行历史",
    assignedBy: "分配者",
    assignedAt: "分配时间",
    totalUsers: "用户总数",
  },
};
