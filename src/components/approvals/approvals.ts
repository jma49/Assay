import { ApprovalStatus, ScriptType, type ApprovalRequestDto } from "@/lib/types/approval";

export type ApprovalRequest = ApprovalRequestDto;
export type ApprovalAction = "approve" | "reject";
export type Language = "en" | "zh";

/** Text colour and status-dot class for a request's status. */
export function statusTone(status: ApprovalStatus): { text: string; dot: string } {
  if (status === ApprovalStatus.APPROVED) return { text: "text-success", dot: "status-dot-clean" };
  if (status === ApprovalStatus.REJECTED) return { text: "text-failure", dot: "status-dot-error" };
  return { text: "text-attention", dot: "status-dot-issues" };
}

export function pageCount(totalItems: number, pageSize: number): number {
  return Math.ceil(totalItems / pageSize);
}

/** Keeps a page number inside 1..totalPages, e.g. after the list shrank under it. */
export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

export function pageSlice<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

const MESSAGES = {
  en: {
    forbidden: "Permission denied: you cannot view approval requests",
    decisionFailed: "Could not record the decision",
    approved: (scriptName: string) => `Approved ${scriptName}`,
    rejected: (scriptName: string) => `Rejected ${scriptName}`,
  },
  zh: {
    forbidden: "权限不足：无法查看审批列表",
    decisionFailed: "审批操作失败",
    approved: (scriptName: string) => `脚本 ${scriptName} 已批准`,
    rejected: (scriptName: string) => `脚本 ${scriptName} 已拒绝`,
  },
};

type OperationType = NonNullable<ApprovalRequest["operationType"]>;

const COPY = {
  en: {
    title: "Approval management",
    description: "Review new and edited checks before they go live",
    pendingTab: "Pending approvals",
    historyTab: "Approval history",
    noPending: "No pending approvals",
    noHistory: "No approval history",
    status: {
      [ApprovalStatus.PENDING]: "Pending",
      [ApprovalStatus.APPROVED]: "Approved",
      [ApprovalStatus.REJECTED]: "Rejected",
      [ApprovalStatus.WITHDRAWN]: "Withdrawn",
    } satisfies Record<ApprovalStatus, string>,
    scriptType: {
      [ScriptType.READ_ONLY]: "Read-only query",
      [ScriptType.DATA_MODIFICATION]: "Data modification",
      [ScriptType.STRUCTURE_CHANGE]: "Structure change",
      [ScriptType.SYSTEM_ADMIN]: "System admin",
    } satisfies Record<ScriptType, string>,
    approve: "Approve",
    reject: "Reject",
    approved: "Approved",
    rejected: "Rejected",
    approveTitle: "Approve check",
    rejectTitle: "Reject check",
    cancel: "Cancel",
    operation: { create: "New check", update: "Edit", delete: "Delete" } satisfies Record<OperationType, string>,
    showSql: "Show SQL",
    hideSql: "Hide SQL",
    showChanges: "Show changes",
    hideChanges: "Hide changes",
    changeCount: (added: number, removed: number) => `+${added} −${removed} lines`,
    unchangedSql: "The SQL is unchanged; only other fields differ.",
    removedSql: "The check and this SQL will be deleted.",
    noSql: "This request carries no SQL.",
    sqlLabel: "SQL",
    commentLabel: "Comment (optional)",
    commentPlaceholder: "Add a note for the author",
    rejectLabel: "Reason",
    rejectPlaceholder: "Tell the author what to change",
    dataSource: "Data source the check runs against",
  },
  zh: {
    title: "审批管理",
    description: "新建和修改的检查上线前在这里审核",
    pendingTab: "待审批",
    historyTab: "审批历史",
    noPending: "暂无待审批的检查",
    noHistory: "暂无审批历史",
    status: {
      [ApprovalStatus.PENDING]: "待审批",
      [ApprovalStatus.APPROVED]: "已批准",
      [ApprovalStatus.REJECTED]: "已拒绝",
      [ApprovalStatus.WITHDRAWN]: "已撤回",
    } satisfies Record<ApprovalStatus, string>,
    scriptType: {
      [ScriptType.READ_ONLY]: "只读查询",
      [ScriptType.DATA_MODIFICATION]: "数据修改",
      [ScriptType.STRUCTURE_CHANGE]: "结构变更",
      [ScriptType.SYSTEM_ADMIN]: "系统管理",
    } satisfies Record<ScriptType, string>,
    approve: "批准",
    reject: "拒绝",
    approved: "已批准",
    rejected: "已拒绝",
    approveTitle: "批准检查",
    rejectTitle: "拒绝检查",
    cancel: "取消",
    operation: { create: "新建检查", update: "修改", delete: "删除" } satisfies Record<OperationType, string>,
    showSql: "查看 SQL",
    hideSql: "收起 SQL",
    showChanges: "查看改动",
    hideChanges: "收起改动",
    changeCount: (added: number, removed: number) => `+${added} −${removed} 行`,
    unchangedSql: "SQL 没有改动，只改了其他字段。",
    removedSql: "批准后会删除这条检查和这段 SQL。",
    noSql: "这条申请没有附带 SQL。",
    sqlLabel: "SQL",
    commentLabel: "备注（可选）",
    commentPlaceholder: "给作者留言",
    rejectLabel: "理由",
    rejectPlaceholder: "告诉作者需要改什么",
    dataSource: "检查读取的数据源",
  },
};

export type ApprovalCopy = (typeof COPY)["en"];

export function approvalCopy(language: Language): ApprovalCopy {
  return COPY[language] ?? COPY.en;
}

/** What the SQL block shows: the diff for a pending edit, else the request's SQL. */
export function sqlView(approval: Pick<ApprovalRequest, "operationType" | "sqlContent" | "currentSqlContent">):
  | { kind: "none" }
  | { kind: "sql"; sql: string; removed: boolean }
  | { kind: "diff"; before: string; after: string } {
  const sql = approval.sqlContent ?? "";
  if (approval.operationType === "delete") {
    const removed = approval.currentSqlContent ?? sql;
    return removed ? { kind: "sql", sql: removed, removed: true } : { kind: "none" };
  }
  if (approval.operationType === "update" && approval.currentSqlContent !== undefined) {
    return { kind: "diff", before: approval.currentSqlContent, after: sql };
  }
  return sql ? { kind: "sql", sql, removed: false } : { kind: "none" };
}

export function approvalMessages(language: Language) {
  return MESSAGES[language] ?? MESSAGES.en;
}

export function decisionToast(action: ApprovalAction, scriptName: string, language: Language): string {
  const messages = approvalMessages(language);
  return action === "approve" ? messages.approved(scriptName) : messages.rejected(scriptName);
}
