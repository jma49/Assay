import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { DashboardTranslationKeys, SqlScript } from "@/components/business/dashboard/types";
import type { ScriptFormData } from "../ScriptMetadataForm";
import { newCheckTemplate } from "../sql-template";
import {
  applyFieldChange,
  approvalNotice,
  classifySave,
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
  type ScriptFormState,
} from "./script-form";

type Translate = (key: DashboardTranslationKeys | string) => string;

const showError = ({ title, ...options }: Notice) => toast.error(title, options);
const showSuccess = ({ title, ...options }: Notice) => toast.success(title, options);

/** State and save flow of the add/edit dialog. `reload` refreshes the list after a save or a conflict. */
export function useScriptEditor(language: Language, t: Translate, reload: () => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("add");
  const [form, setForm] = useState<ScriptFormState>({});
  const [sql, setSql] = useState("");
  const [initialSql, setInitialSql] = useState("");
  const [idManuallyEdited, setIdManuallyEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const open = useCallback((nextMode: DialogMode, script?: SqlScript) => {
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

  const changeField = (field: keyof ScriptFormData, value: string | boolean | string[]) => {
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
      const response =
        mode === "add"
          ? await fetch("/api/scripts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(createPayload(form, sql)),
            })
          : await fetch(`/api/scripts/${form.scriptId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatePayload(form, sql, initialSql)),
            });

      const body = response.ok
        ? await response.json()
        : await response.json().catch(() => ({ message: t(errorKey) }));
      const outcome = classifySave(response, body, mode);

      switch (outcome.kind) {
        case "conflict":
          showError(conflictNotice(language));
          reload();
          return;
        case "approval":
          showSuccess(approvalNotice(language, outcome.message, "save"));
          setIsOpen(false);
          return;
        case "failed":
          throw new Error(outcome.message);
        case "saved":
          toast.success(t(mode === "add" ? "scriptSavedSuccess" : "scriptUpdatedSuccess"));
          setIsOpen(false);
          reload();
      }
    } catch (err) {
      console.error(`Failed to ${mode} script:`, err);
      toast.error(t(errorKey) || `Failed to ${mode} script`, {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isOpen, setIsOpen, mode, form, sql, setSql, isSubmitting, open, changeField, save };
}
