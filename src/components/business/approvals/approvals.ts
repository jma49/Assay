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
  [ApprovalStatus.DRAFT]: "draft",
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

export function approvalMessages(language: Language) {
  return MESSAGES[language] ?? MESSAGES.en;
}

export function decisionToast(action: ApprovalAction, scriptName: string, language: Language): string {
  const messages = approvalMessages(language);
  return action === "approve" ? messages.approved(scriptName) : messages.rejected(scriptName);
}
