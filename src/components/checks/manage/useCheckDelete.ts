import { useState } from "react";
import { toast } from "sonner";
import type { CheckDefinition } from "@/components/runs/types";
import { apiErrorText } from "@/client/api-errors";
import { sendJson } from "@/client/send-json";
import { approvalNotice, type Language } from "./check-form";
import { manageCopy } from "./copy";

/** The delete confirmation: which check is pending and the DELETE call. `reload` refreshes the list. */
export function useCheckDelete(language: Language, reload: () => void) {
  const t = manageCopy(language);
  const [target, setTarget] = useState<CheckDefinition | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ask = (script: CheckDefinition) => {
    setTarget(script);
    setIsOpen(true);
  };

  const confirm = async () => {
    if (!target) return;
    setIsSubmitting(true);
    try {
      const body = await sendJson<{ requiresApproval?: boolean }>(`/api/checks/${encodeURIComponent(target.scriptId)}`, "DELETE");
      if (body.requiresApproval) {
        const { title, ...options } = approvalNotice(language, "delete");
        toast.success(title, options);
        return;
      }
      toast.success(t.deleted);
      reload();
    } catch (err) {
      console.error("Failed to delete script:", err);
      toast.error(t.deleteFailed, { description: apiErrorText(err, language) });
    } finally {
      setIsSubmitting(false);
      setIsOpen(false);
      setTarget(null);
    }
  };

  return { target, isOpen, setIsOpen, isSubmitting, ask, confirm, cancel: () => setTarget(null) };
}
