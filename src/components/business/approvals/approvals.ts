import { ApprovalStatus, ScriptType, type ApprovalRequestDto } from "@/lib/types/approval";
import type { DashboardTranslationKeys } from "@/components/business/dashboard/types";

export type ApprovalRequest = ApprovalRequestDto;
export type ApprovalAction = "approve" | "reject";
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

/** Fills the "Showing %s-%s of %s results (Page %s of %s)" template. */
export function formatPageInfo(
  template: string,
  { page, totalPages, totalItems, pageSize }: { page: number; totalPages: number; totalItems: number; pageSize: number },
): string {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(start - 1 + pageSize, totalItems);
  return [start, end, totalItems, page, totalPages].reduce<string>(
    (text, value) => text.replace("%s", String(value)),
    template,
  );
}

/** The page typed into the jump box, or null when it is not a page that exists. */
export function parsePageInput(input: string, totalPages: number): number | null {
  const page = parseInt(input, 10);
  if (isNaN(page) || page < 1 || page > totalPages) return null;
  return page;
}

const PAGE_INPUT_EDIT_KEYS = ["ArrowLeft", "ArrowRight", "Delete", "Backspace", "Tab"];

/** Whether a key press may reach the numeric page-jump box. */
export function isPageInputKeyAllowed(key: string): boolean {
  return /[\d\b]/.test(key) || PAGE_INPUT_EDIT_KEYS.includes(key);
}
