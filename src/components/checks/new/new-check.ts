import { DEFAULT_SOURCE_ID, SOURCE_ID_PATTERN } from "@/domain/data-source";
import type { ScriptFormData } from "@/components/business/scripts/ScriptMetadataForm";
import { scheduleProblem } from "@/lib/scheduling/schedule";
import { sqlValidationMessage, validateReadOnlySql } from "@/lib/sql/read-only-validator";

export type Language = "en" | "zh";

/** The fields the new-check page can mark invalid, in the order they appear on the page. */
const INVALID_FIELDS = ["sql", "name", "scriptId", "cronSchedule"] as const;
export type InvalidField = (typeof INVALID_FIELDS)[number];
export type FieldErrors = Partial<Record<InvalidField, string>>;

const SCRIPT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TABLE_NAME = /^[A-Za-z_][\w$]*(\.[A-Za-z_][\w$]*)?$/;

export const INITIAL_SQL = `-- A check passes when this query returns no rows.
-- Return the rows that need attention, for example:
SELECT id, created_at
FROM your_table
WHERE status IS NULL;
`;

export const EMPTY_FORM: ScriptFormData = {
  scriptId: "",
  name: "",
  cnName: "",
  description: "",
  cnDescription: "",
  author: "",
  scope: "",
  cnScope: "",
  hashtags: [],
  isScheduled: false,
  cronSchedule: "",
  dataSourceId: DEFAULT_SOURCE_ID,
};

const MESSAGES = {
  en: {
    name: "Add a name.",
    scriptId: "Add a check ID.",
    badId: "Use lowercase letters, numbers and hyphens only.",
    takenId: "A check with this ID already exists.",
    sql: "Write the query.",
  },
  zh: {
    name: "请填写名称。",
    scriptId: "请填写检查 ID。",
    badId: "只能使用小写字母、数字和连字符。",
    takenId: "已有使用这个 ID 的检查。",
    sql: "请填写查询。",
  },
};

/** A check id from a name: "Duplicate orders!" → "duplicate-orders". */
export function toScriptId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The table a coverage link (`?table=schema.table`) asks for; only plain identifiers count. */
/** The data source a coverage link (`?source=`) asks for; only valid ids count. */
export function sourceFromSearch(search: string): string | null {
  const source = new URLSearchParams(search).get("source");
  return source && SOURCE_ID_PATTERN.test(source) ? source : null;
}

export function tableFromSearch(search: string): string | null {
  const table = new URLSearchParams(search).get("table");
  return table && TABLE_NAME.test(table) ? table : null;
}

/** A starting query for a check on one table, opened from the coverage view. */
export function starterSqlFor(table: string): string {
  return `-- A check passes when this query returns no rows.
-- Replace "false" with what makes a row need attention.
SELECT *
FROM ${table}
WHERE false;
`;
}

/** Everything that stops the check from saving, one message per field. */
export function validateNewCheck(form: ScriptFormData, sql: string, language: Language): FieldErrors {
  const t = MESSAGES[language];
  const errors: FieldErrors = {};
  if (!sql.trim()) errors.sql = t.sql;
  else {
    const validation = validateReadOnlySql(sql);
    if (!validation.isValid) errors.sql = sqlValidationMessage(validation, language) ?? t.sql;
  }
  if (!form.name.trim()) errors.name = t.name;
  if (!form.scriptId.trim()) errors.scriptId = t.scriptId;
  else if (!SCRIPT_ID_PATTERN.test(form.scriptId)) errors.scriptId = t.badId;
  const schedule = scheduleProblem(form.isScheduled, form.cronSchedule, language);
  if (schedule) errors.cronSchedule = schedule;
  return errors;
}

/** The first field on the page with an error, the one to move focus to. */
export function firstInvalid(errors: FieldErrors): InvalidField | null {
  return INVALID_FIELDS.find((field) => errors[field]) ?? null;
}

/** A save the API refused because the id is taken, shown on the id field instead of a toast. */
export function saveErrorField(code: string | undefined, language: Language): FieldErrors | null {
  return code === "id_taken" ? { scriptId: MESSAGES[language].takenId } : null;
}

/** Where to go after saving: the new check, or the list when it waits for approval (it does not exist yet). */
export function afterSaveHref(scriptId: string, requiresApproval: boolean): string {
  return requiresApproval ? "/checks" : `/checks/${encodeURIComponent(scriptId)}`;
}
