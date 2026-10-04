import { DEFAULT_SOURCE_ID } from "@/domain/data-source";
import type { CheckDefinition } from "@/components/runs/types";
import { scheduleProblem } from "@/lib/scheduling/schedule";
import { sqlValidationMessage, validateReadOnlySql } from "@/lib/sql/read-only-validator";
import type { CheckFormData } from "./CheckMetadataForm";

/** The editor's working copy: metadata plus whatever the loaded check carried (e.g. `version`). */
export type CheckFormState = Partial<CheckDefinition>;
export type DialogMode = "add" | "edit";
export type Language = "en" | "zh";

export interface Notice {
  title: string;
  description?: string;
  duration?: number;
}

const isZh = (language: Language) => language === "zh";

export const newScriptId = (now = Date.now()) => `new-script-${now.toString().slice(-6)}`;

export function emptyForm(scriptId: string): CheckFormState {
  return {
    scriptId,
    name: "",
    cnName: "",
    description: "",
    cnDescription: "",
    scope: "",
    cnScope: "",
    author: "",
    hashtags: [],
    isScheduled: false,
    cronSchedule: "",
    dataSourceId: DEFAULT_SOURCE_ID,
  };
}

export function formFromScript(script: CheckDefinition): CheckFormState {
  return {
    ...script,
    isScheduled: typeof script.isScheduled === "boolean" ? script.isScheduled : false,
    cronSchedule: script.cronSchedule || "",
  };
}

export const suggestScriptId = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

interface FieldChangeState {
  form: CheckFormState;
  idManuallyEdited: boolean;
}

/** Applies one form edit; while adding, the script ID follows the name until the user types one. */
export function applyFieldChange(
  { form, idManuallyEdited }: FieldChangeState,
  mode: DialogMode,
  field: keyof CheckFormData,
  value: string | boolean | string[],
): FieldChangeState {
  const next: CheckFormState = { ...form, [field]: value };
  if (mode === "add" && field === "name" && !idManuallyEdited && typeof value === "string" && value) {
    next.scriptId = suggestScriptId(value);
  }
  return { form: next, idManuallyEdited: idManuallyEdited || field === "scriptId" };
}

export function toFormMetadata(form: CheckFormState): CheckFormData {
  return {
    scriptId: form.scriptId || "",
    name: form.name || "",
    cnName: form.cnName || "",
    description: form.description || "",
    cnDescription: form.cnDescription || "",
    author: form.author || "",
    scope: form.scope || "",
    cnScope: form.cnScope || "",
    hashtags: form.hashtags || [],
    isScheduled: typeof form.isScheduled === "boolean" ? form.isScheduled : false,
    cronSchedule: form.cronSchedule || "",
    dataSourceId: form.dataSourceId || DEFAULT_SOURCE_ID,
  };
}

/** Fields the save button refuses to go without. */
function missingRequiredFields(form: CheckFormState, sql: string, language: Language): string[] {
  const zh = isZh(language);
  const missing: string[] = [];
  if (!form.scriptId?.trim()) missing.push(zh ? "脚本ID" : "script ID");
  if (!form.name?.trim()) missing.push(zh ? "脚本名称" : "name");
  if (!form.author?.trim()) missing.push(zh ? "作者" : "author");
  if (!sql?.trim()) missing.push(zh ? "SQL内容" : "SQL");
  return missing;
}

/** The hint in the dialog footer; it lists what is still empty before the user tries to save. */
export function stillNeededHint(form: CheckFormState, sql: string, language: Language): string | null {
  const zh = isZh(language);
  const missing = [
    !form.name?.trim() && (zh ? "名称" : "name"),
    !form.scriptId?.trim() && (zh ? "脚本 ID" : "script ID"),
    !sql?.trim() && (zh ? "查询" : "query"),
  ].filter(Boolean);
  if (missing.length === 0) return null;
  return zh ? `还需填写：${missing.join("、")}` : `Still needed: ${missing.join(", ")}`;
}

/** Client-side checks before a save is sent; the server repeats them. */
export function saveProblem(form: CheckFormState, sql: string, language: Language): Notice | null {
  const zh = isZh(language);
  const missing = missingRequiredFields(form, sql, language);
  if (missing.length > 0) {
    return {
      title: zh ? "请填写必填字段" : "Fill in the required fields",
      description: zh ? `缺少字段：${missing.join("、")}` : `Missing: ${missing.join(", ")}`,
      duration: 6000,
    };
  }

  const badSchedule = scheduleProblem(form.isScheduled, form.cronSchedule, language);
  if (badSchedule) return { title: badSchedule };

  const readOnly = validateReadOnlySql(sql);
  if (!readOnly.isValid) {
    return {
      title: zh ? "查询未通过只读检查" : "The query failed the read-only check",
      description: sqlValidationMessage(readOnly, language),
      duration: 10000,
    };
  }
  return null;
}

export const createPayload = (form: CheckFormState, sql: string): Partial<CheckDefinition> => ({
  ...form,
  sqlContent: sql,
});

/** The PUT body: metadata, the SQL only when it changed, and the version the edit started from. */
export function updatePayload(form: CheckFormState, sql: string, initialSql: string): Partial<CheckDefinition> {
  const payload: Partial<CheckDefinition> = {
    name: form.name,
    cnName: form.cnName,
    description: form.description,
    cnDescription: form.cnDescription,
    scope: form.scope,
    cnScope: form.cnScope,
    author: form.author,
    hashtags: form.hashtags,
    isScheduled: form.isScheduled,
    cronSchedule: form.cronSchedule,
    dataSourceId: form.dataSourceId,
    // The server refuses the save with 409 if someone saved since this version.
    version: form.version ?? 0,
  };
  if (sql !== initialSql) payload.sqlContent = sql;

  for (const key of Object.keys(payload) as (keyof typeof payload)[]) {
    if (payload[key] === undefined) delete payload[key];
  }
  return payload;
}

export function conflictNotice(language: Language): Notice {
  const zh = isZh(language);
  return {
    title: zh ? "这个检查已被其他人修改" : "Someone else changed this check",
    description: zh
      ? "你的修改没有保存。已刷新列表，请重新打开后再编辑。"
      : "Your change was not saved. The list has been reloaded; open the check again to edit it.",
    duration: 8000,
  };
}

export function approvalNotice(language: Language, action: "save" | "delete"): Notice {
  const zh = isZh(language);
  const title =
    action === "delete"
      ? zh ? "删除申请已提交" : "Deletion submitted for approval"
      : zh ? "申请已提交" : "Submitted for approval";
  const description = zh ? "管理员审批后才会生效。" : "It takes effect once an admin approves it.";
  return { title, description, duration: 6000 };
}
