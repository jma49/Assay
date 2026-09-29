import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiErrorText } from "@/client/api-errors";
import { apiErrorCode, sendJson } from "@/client/send-json";
import type { ScriptFormData } from "@/components/business/scripts/ScriptMetadataForm";
import { useCurrentUser } from "@/lib/auth/client";
import { useMe } from "@/lib/auth/use-me";
import type { TableRef, TemplateCheck } from "@/lib/checks/templates";
import {
  EMPTY_FORM,
  INITIAL_SQL,
  afterSaveHref,
  firstInvalid,
  saveErrorField,
  starterSqlFor,
  tableFromSearch,
  toScriptId,
  validateNewCheck,
  type FieldErrors,
  type InvalidField,
  type Language,
} from "./new-check";

const COPY = {
  en: {
    saved: "Check saved",
    submitted: "Submitted for approval",
    submittedDesc: "An admin or manager needs to approve it before it runs.",
    failed: "Could not save the check",
    templateApplied: "Template applied",
    undo: "Undo",
  },
  zh: {
    saved: "检查已保存",
    submitted: "已提交审批",
    submittedDesc: "需要管理员或经理审批后才会生效。",
    failed: "保存失败",
    templateApplied: "已套用模板",
    undo: "撤销",
  },
};

/** Moves focus to a field the page marked invalid; the query lives in the CodeMirror editor. */
function focusField(field: InvalidField) {
  const target =
    field === "sql"
      ? document.querySelector<HTMLElement>("#new-check-sql .cm-content")
      : (document.getElementById(field) ?? document.getElementById("isScheduled"));
  target?.focus();
  target?.scrollIntoView({ block: "center", behavior: "smooth" });
}

/** The new-check form: its fields, the template shortcut, inline validation and saving. */
export function useNewCheck(language: Language) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const me = useMe();
  const c = COPY[language];

  const [formData, setFormData] = useState<ScriptFormData>(EMPTY_FORM);
  const [sqlContent, setSqlContent] = useState(INITIAL_SQL);
  const [scriptIdEdited, setScriptIdEdited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tableParam, setTableParam] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Coverage links here with ?table=schema.table. The page is prerendered, so
  // the query string is read after mount to keep hydration matching.
  useEffect(() => {
    const table = tableFromSearch(window.location.search);
    if (!table) return;
    setTableParam(table);
    setSqlContent(starterSqlFor(table));
    const schema = table.includes(".") ? table.split(".")[0] : "";
    if (schema) setFormData((prev) => (prev.scope ? prev : { ...prev, scope: schema }));
  }, []);

  // Prefill the author once the signed-in user is known; the API falls back to it anyway.
  const defaultAuthor = user?.name;
  const [prefilledAuthor, setPrefilledAuthor] = useState<string | undefined>(undefined);
  if (defaultAuthor && defaultAuthor !== prefilledAuthor) {
    setPrefilledAuthor(defaultAuthor);
    setFormData((prev) => (prev.author ? prev : { ...prev, author: defaultAuthor }));
  }

  const clearError = (...fields: InvalidField[]) =>
    setErrors((prev) => (fields.some((field) => prev[field]) ? Object.fromEntries(Object.entries(prev).filter(([key]) => !fields.includes(key as InvalidField))) : prev));

  const changeField = (field: keyof ScriptFormData, value: string | boolean | string[]) => {
    const renamesId = field === "name" && typeof value === "string" && !scriptIdEdited;
    setFormData((prev) => ({ ...prev, [field]: value, ...(renamesId && { scriptId: toScriptId(value) }) }));
    if (field === "scriptId") setScriptIdEdited(true);
    clearError(...([field, renamesId && "scriptId", field === "isScheduled" && "cronSchedule"].filter(Boolean) as InvalidField[]));
  };

  const changeSql = (value: string) => {
    setSqlContent(value);
    clearError("sql");
  };

  // A template replaces the query and the names; the toast can put them back.
  const applyTemplate = (check: TemplateCheck, table: TableRef) => {
    const before = { sqlContent, formData, scriptIdEdited };
    setSqlContent(check.sql);
    setFormData((prev) => ({
      ...prev,
      scriptId: check.scriptId,
      name: check.name,
      cnName: check.cnName,
      description: check.description,
      cnDescription: check.cnDescription,
      scope: prev.scope || table.schema,
    }));
    setScriptIdEdited(false);
    setErrors({});
    toast.success(c.templateApplied, {
      action: {
        label: c.undo,
        onClick: () => {
          setSqlContent(before.sqlContent);
          setFormData(before.formData);
          setScriptIdEdited(before.scriptIdEdited);
        },
      },
    });
  };

  const showErrors = (next: FieldErrors) => {
    setErrors(next);
    const first = firstInvalid(next);
    // After the render that marks the fields.
    if (first) requestAnimationFrame(() => focusField(first));
  };

  const save = async () => {
    const problems = validateNewCheck(formData, sqlContent, language);
    if (firstInvalid(problems)) return showErrors(problems);

    setIsSaving(true);
    try {
      const result = await sendJson<{ requiresApproval?: boolean }>("/api/scripts", "POST", { ...formData, sqlContent });
      if (result.requiresApproval) toast.success(c.submitted, { description: c.submittedDesc });
      else toast.success(c.saved);
      router.push(afterSaveHref(formData.scriptId, Boolean(result.requiresApproval)));
    } catch (error) {
      const fieldError = saveErrorField(apiErrorCode(error), language);
      if (fieldError) showErrors(fieldError);
      else toast.error(c.failed, { description: apiErrorText(error, language) });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    /** Null until the user's permissions are known. */
    canCreate: me ? me.permissions.includes("script:create") : null,
    formData,
    sqlContent,
    tableParam,
    errors,
    isSaving,
    changeField,
    changeSql,
    applyTemplate,
    save,
    cancel: () => router.push("/checks"),
  };
}
