import { useState } from "react";
import { toast } from "sonner";
import type { DashboardTranslationKeys, SqlScript } from "@/components/business/dashboard/types";
import { approvalNotice, classifyDelete, type Language } from "./script-form";

type Translate = (key: DashboardTranslationKeys | string) => string;

/** The delete confirmation: which check is pending and the DELETE call. `reload` refreshes the list. */
export function useScriptDelete(language: Language, t: Translate, reload: () => void) {
  const [target, setTarget] = useState<SqlScript | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ask = (script: SqlScript) => {
    setTarget(script);
    setIsOpen(true);
  };

  const confirm = async () => {
    if (!target) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/scripts/${target.scriptId}`, { method: "DELETE" });
      const body = response.ok
        ? await response.json()
        : await response.json().catch(() => ({ message: t("scriptDeleteError") }));
      const outcome = classifyDelete(response, body);

      if (outcome.kind === "failed") throw new Error(outcome.message);
      if (outcome.kind === "approval") {
        const { title, ...options } = approvalNotice(language, outcome.message, "delete");
        toast.success(title, options);
        return;
      }
      toast.success(t("scriptDeletedSuccess"));
      reload();
    } catch (err) {
      console.error("Failed to delete script:", err);
      toast.error(t("scriptDeleteError"), { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsSubmitting(false);
      setIsOpen(false);
      setTarget(null);
    }
  };

  return { target, isOpen, setIsOpen, isSubmitting, ask, confirm, cancel: () => setTarget(null) };
}
