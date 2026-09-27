import type { EditHistoryFilter, EditHistoryRecord } from "@/lib/workflows/edit-history-schema";

export type Translate = (key: string) => string;
export type Operation = EditHistoryRecord["operation"];
export type OperationFilter = NonNullable<EditHistoryFilter["operation"]>;
export type FieldChange = NonNullable<EditHistoryRecord["changes"]>[number];

/** Filter inputs as the user typed them; dates are `yyyy-mm-dd` strings from `<input type="date">`. */
export interface HistoryFilters {
  scriptName: string;
  author: string;
  operation: OperationFilter;
  dateFrom: string;
  dateTo: string;
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
  const [, year, month, day] = match.map(Number);
  return new Date(year, month - 1, day);
}

/** Query string for `/api/edit-history`, newest first. */
export function buildHistoryQuery(filters: HistoryFilters, page: number, pageSize: number): string {
  const params = new URLSearchParams();
  const scriptName = filters.scriptName.trim();
  const author = filters.author.trim();
  const dateFrom = parseDateInput(filters.dateFrom);
  const dateTo = parseDateInput(filters.dateTo);
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

/** A page number typed into the jump box, or null when it is not a page that exists. */
export function parseJumpPage(input: string, totalPages: number): number | null {
  const page = parseInt(input, 10);
  return !isNaN(page) && page >= 1 && page <= totalPages ? page : null;
}

const JUMP_EDITING_KEYS = ["ArrowLeft", "ArrowRight", "Delete", "Backspace", "Tab"];

/** Whether a key may reach the jump box, which only takes digits and editing keys. */
export function isJumpInputKey(key: string): boolean {
  return /[\d\b]/.test(key) || JUMP_EDITING_KEYS.includes(key);
}

export function formatPageInfo(
  t: Translate,
  { currentPage, totalPages, totalRecords, pageSize }: { currentPage: number; totalPages: number; totalRecords: number; pageSize: number },
): string {
  if (totalRecords === 0) return t("noResults");
  const start = Math.min((currentPage - 1) * pageSize + 1, totalRecords);
  const end = Math.min(currentPage * pageSize, totalRecords);
  return [start, end, totalRecords, currentPage, totalPages].reduce<string>(
    (text, value) => text.replace("%s", String(value)),
    t("pageInfo"),
  );
}

const OPERATION_BADGE_CLASSES: Record<string, string> = {
  create: "bg-success/10 text-success border-success/30",
  update: "bg-muted text-foreground border-border",
  delete: "bg-failure/10 text-failure border-failure/30",
};

export function operationBadgeClass(operation: string): string {
  return OPERATION_BADGE_CLASSES[operation] ?? OPERATION_BADGE_CLASSES.update;
}

const OPERATION_LABEL_KEYS: Record<string, string> = {
  create: "operationCreate",
  update: "operationUpdate",
  delete: "operationDelete",
};

export function operationLabel(operation: string, t: Translate): string {
  const key = OPERATION_LABEL_KEYS[operation];
  return key ? t(key) : operation;
}

const MAX_VALUE_LENGTH = 50;

/** A changed field's old or new value, shortened for the diff view. */
export function formatChangeValue(value: unknown, t: Translate): string {
  if (value === null || value === undefined) return t("noData");
  if (typeof value === "boolean") return value ? t("scheduled") : t("manual");
  if (typeof value === "string" && value.length > MAX_VALUE_LENGTH) return value.substring(0, MAX_VALUE_LENGTH) + "...";
  return String(value);
}

export function fieldLabel(change: FieldChange): string {
  return change.fieldDisplayNameCn || change.fieldDisplayName;
}

export function changesPreview(changes: EditHistoryRecord["changes"], t: Translate): string {
  if (!changes || changes.length === 0) return t("noChanges");
  if (changes.length === 1) return fieldLabel(changes[0]);
  return t("fieldChangesCount").replace("{count}", String(changes.length));
}

export function historyDescription(history: EditHistoryRecord): string | undefined {
  return history.descriptionCn || history.description;
}

export function operationTimeIso(history: EditHistoryRecord): string {
  const time: Date | string = history.operationTime;
  return typeof time === "string" ? time : time.toISOString();
}
