import { paginationCopy } from "@/components/common/pagination-copy";
import { describePage } from "@/lib/utils/pagination";
import type { EditHistoryFilter, EditHistoryRecord } from "@/contracts/edit-history";
import { editHistoryCopy, type EditHistoryCopy } from "./copy";
export type OperationFilter = NonNullable<EditHistoryFilter["operation"]>;
export type FieldChange = NonNullable<EditHistoryRecord["changes"]>[number];

/** Filter inputs as the user typed them; dates are `yyyy-mm-dd` strings from `<input type="date">`. */
export interface HistoryFilters {
  scriptName: string;
  author: string;
  operation: OperationFilter;
  dateFrom: string;
  dateTo: string;
  /** One check only, matched exactly (the history dialog on the manage page). */
  scriptId?: string;
}

export const EMPTY_FILTERS: HistoryFilters = {
  scriptName: "",
  author: "",
  operation: "all",
  dateFrom: "",
  dateTo: "",
};

/**
 * Midnight at the start of a `yyyy-mm-dd` day in the viewer's time zone.
 * `new Date("yyyy-mm-dd")` would give UTC midnight and shift the range by the viewer's offset.
 */
export function parseDateInput(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, year = 0, month = 1, day = 1] = match.map(Number);
  return new Date(year, month - 1, day);
}

/** Query string for `/api/edit-history`, newest first. */
export function buildHistoryQuery(filters: HistoryFilters, page: number, pageSize: number): string {
  const params = new URLSearchParams();
  const scriptName = filters.scriptName.trim();
  const author = filters.author.trim();
  const dateFrom = parseDateInput(filters.dateFrom);
  const dateTo = parseDateInput(filters.dateTo);
  if (filters.scriptId) params.set("scriptId", filters.scriptId);
  if (scriptName) params.set("scriptName", scriptName);
  if (author) params.set("author", author);
  if (filters.operation !== "all") params.set("operation", filters.operation);
  if (dateFrom) params.set("dateFrom", dateFrom.toISOString());
  if (dateTo) params.set("dateTo", dateTo.toISOString());
  params.set("page", String(page || 1));
  params.set("limit", String(pageSize));
  params.set("sortBy", "operationTime");
  params.set("sortOrder", "desc");
  return params.toString();
}

export function formatPageInfo(
  language: string,
  { currentPage, totalPages, totalRecords, pageSize, totalCapped }: { currentPage: number; totalPages: number; totalRecords: number; pageSize: number; totalCapped?: boolean },
): string {
  if (totalRecords === 0) return editHistoryCopy(language).noResults;
  return describePage(paginationCopy(language).pageInfo, { page: currentPage, totalPages, totalItems: totalRecords, pageSize, totalCapped });
}

const OPERATION_BADGE_CLASSES: Record<string, string> & { update: string } = {
  create: "bg-success/10 text-success border-success/30",
  update: "bg-muted text-foreground border-border",
  delete: "bg-failure/10 text-failure border-failure/30",
};

export function operationBadgeClass(operation: string): string {
  return OPERATION_BADGE_CLASSES[operation] ?? OPERATION_BADGE_CLASSES.update;
}

export function operationLabel(operation: string, copy: EditHistoryCopy): string {
  return copy.operations[operation] ?? operation;
}

const MAX_VALUE_LENGTH = 50;

/** A changed field's old or new value, shortened for the diff view. */
export function formatChangeValue(value: unknown, copy: EditHistoryCopy, maxLength = MAX_VALUE_LENGTH): string {
  if (value === null || value === undefined) return copy.noData;
  if (typeof value === "boolean") return value ? copy.scheduled : copy.manual;
  if (typeof value === "string" && value.length > maxLength) return value.substring(0, maxLength) + "...";
  return String(value);
}

/** Picks the text for the UI language, falling back to the other one when it is missing. */
function localized(language: string, en: string | undefined, zh: string | undefined): string | undefined {
  return language === "zh" ? zh || en : en || zh;
}

export function fieldLabel(change: FieldChange, language: string): string {
  return localized(language, change.fieldDisplayName, change.fieldDisplayNameCn) ?? "";
}

export function changesPreview(changes: EditHistoryRecord["changes"], language: string): string {
  const copy = editHistoryCopy(language);
  if (!changes || changes.length === 0) return copy.noChanges;
  if (changes.length === 1 && changes[0]) return fieldLabel(changes[0], language);
  return copy.changeCount(changes.length);
}

export function historyDescription(history: EditHistoryRecord, language: string): string | undefined {
  return localized(language, history.description, history.descriptionCn);
}

export function operationTimeIso(history: EditHistoryRecord): string {
  const time: Date | string = history.operationTime;
  return typeof time === "string" ? time : time.toISOString();
}
