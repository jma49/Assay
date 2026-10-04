import { useCallback, useState } from "react";
import { toast } from "sonner";
import { apiErrorText } from "@/client/api-errors";
import { apiErrorCode, sendJson } from "@/client/send-json";
import type { DashboardTranslationKeys, CheckDefinition } from "@/components/business/dashboard/types";
import type { CheckFormData } from "./CheckMetadataForm";
import { newCheckTemplate } from "./sql-template";
import {
  applyFieldChange,
  approvalNotice,
  conflictNotice,
  createPayload,
  emptyForm,
  formFromScript,
  newScriptId,
  saveProblem,
  updatePayload,
  type DialogMode,
  type Language,
  type Notice,
  type CheckFormState,
} from "./check-form";

type Translate = (key: DashboardTranslationKeys | string) => string;

/** A save that went through, or was filed for approval. */
interface SaveResponse {
  requiresApproval?: boolean;
}

const showError = ({ title, ...options }: Notice) => toast.error(title, options);
const showSuccess = ({ title, ...options }: Notice) => toast.success(title, options);

/** State and save flow of the add/edit dialog. `reload` refreshes the list after a save or a conflict. */
export function useCheckEditor(language: Language, t: Translate, reload: () => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("add");
  const [form, setForm] = useState<CheckFormState>({});
  const [sql, setSql] = useState("");
  const [initialSql, setInitialSql] = useState("");
  const [idManuallyEdited, setIdManuallyEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const open = useCallback((nextMode: DialogMode, script?: CheckDefinition) => {
    setMode(nextMode);
    if (nextMode === "add") {
      const template = newCheckTemplate();
      setForm(emptyForm(newScriptId()));
      setSql(template);
      setInitialSql(template);
      setIdManuallyEdited(false);
    } else if (script) {
      setForm(formFromScript(script));
      setSql(script.sqlContent || "");
      setInitialSql(script.sqlContent || "");
      setIdManuallyEdited(true);
    }
    setIsOpen(true);
  }, []);

  const changeField = (field: keyof CheckFormData, value: string | boolean | string[]) => {
    const next = applyFieldChange({ form, idManuallyEdited }, mode, field, value);
    setForm(next.form);
    setIdManuallyEdited(next.idManuallyEdited);
  };

  const save = async () => {
    const problem = saveProblem(form, sql, language);
    if (problem) {
      showError(problem);
      return;
    }

    setIsSubmitting(true);
    const errorKey = mode === "add" ? "scriptSaveError" : "scriptUpdateError";
    try {
      const body =
        mode === "add"
          ? await sendJson<SaveResponse>("/api/checks", "POST", createPayload(form, sql))
          : await sendJson<SaveResponse>(`/api/checks/${form.scriptId}`, "PUT", updatePayload(form, sql, initialSql));

      setIsOpen(false);
      if (body.requiresApproval) {
        showSuccess(approvalNotice(language, "save"));
        return;
      }
      toast.success(t(mode === "add" ? "scriptSavedSuccess" : "scriptUpdatedSuccess"));
      reload();
    } catch (err) {
      // Another save won the optimistic-concurrency race.
      if (apiErrorCode(err) === "conflict") {
        showError(conflictNotice(language));
        reload();
        return;
      }
      console.error(`Failed to ${mode} script:`, err);
      toast.error(t(errorKey) || `Failed to ${mode} script`, { description: apiErrorText(err, language) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isOpen, setIsOpen, mode, form, sql, setSql, isSubmitting, open, changeField, save };
}
