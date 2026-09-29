import { ApprovalStatus, ScriptType, type ApprovalRequestDto } from "@/lib/types/approval";
import type { DashboardTranslationKeys } from "@/components/business/dashboard/types";

export type ApprovalRequest = ApprovalRequestDto;
export type ApprovalAction = "approve" | "reject";
export type Language = "en" | "zh";
export type Translate = (key: DashboardTranslationKeys) => string;

export const STATUS_LABEL_KEYS: Record<ApprovalStatus, DashboardTranslationKeys> = {
  [ApprovalStatus.PENDING]: "pending",
  [ApprovalStatus.APPROVED]: "approved",
  [ApprovalStatus.REJECTED]: "rejected",
  [ApprovalStatus.WITHDRAWN]: "withdrawn",
};

export const SCRIPT_TYPE_LABEL_KEYS: Record<ScriptType, DashboardTranslationKeys> = {
  [ScriptType.READ_ONLY]: "readOnlyQuery",
  [ScriptType.DATA_MODIFICATION]: "dataModification",
  [ScriptType.STRUCTURE_CHANGE]: "structureChange",
  [ScriptType.SYSTEM_ADMIN]: "systemAdmin",
};

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
