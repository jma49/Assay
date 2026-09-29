import { useState } from "react";
import { toast } from "sonner";
import type { DashboardTranslationKeys, SqlScript } from "@/components/business/dashboard/types";
import { apiErrorText } from "@/client/api-errors";
import { sendJson } from "@/client/send-json";
import { approvalNotice, type Language } from "./script-form";

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
      const body = await sendJson<{ requiresApproval?: boolean }>(`/api/scripts/${target.scriptId}`, "DELETE");
      if (body.requiresApproval) {
        const { title, ...options } = approvalNotice(language, "delete");
        toast.success(title, options);
        return;
      }
      toast.success(t("scriptDeletedSuccess"));
      reload();
    } catch (err) {
      console.error("Failed to delete script:", err);
      toast.error(t("scriptDeleteError"), { description: apiErrorText(err, language) });
    } finally {
      setIsSubmitting(false);
      setIsOpen(false);
      setTarget(null);
    }
  };

  return { target, isOpen, setIsOpen, isSubmitting, ask, confirm, cancel: () => setTarget(null) };
}
