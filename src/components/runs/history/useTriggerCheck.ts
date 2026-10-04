import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { runCheck } from "@/client/checks";
import { runResultLabel } from "@/lib/utils/run-message";
import type { CheckListItem } from "../types";
import { selectedCheckId } from "./runs";
import { apiErrorText } from "@/client/api-errors";

const MESSAGE_DURATION_MS = 8000;

/** The check picked in the Run sheet and a single run of it; `onTriggered` refreshes the page afterwards. */
export function useTriggerCheck(availableChecks: CheckListItem[], onTriggered: () => Promise<void>, language: "en" | "zh") {
  const zh = language === "zh";
  const [chosenScriptId, setSelectedScriptId] = useState("");
  const selectedScriptId = selectedCheckId(chosenScriptId, availableChecks);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);
  const [triggerMessageType, setTriggerMessageType] = useState<"success" | "error" | null>(null);

  const selectedCheck = useMemo(
    () => availableChecks.find((script) => script.scriptId === selectedScriptId),
    [availableChecks, selectedScriptId],
  );

  const handleTriggerCheck = useCallback(async () => {
    if (!selectedScriptId || isTriggering) return;
    setIsTriggering(true);
    setTriggerMessage(null);
    setTriggerMessageType(null);

    try {
      const result = await runCheck(selectedScriptId);

      const summary = runResultLabel({ outcome: result.outcome, rowCount: result.rowCount, message: result.message }, language);
      // Refresh first, so the history already lists the run the toast talks about.
      await onTriggered();
      setTriggerMessage(summary);
      setTriggerMessageType("success");
      toast.success(zh ? "执行完成" : "Run finished", { description: summary, duration: 5000 });
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("Failed to trigger check:", err);
      const message = apiErrorText(err, language, zh ? "执行失败" : "Trigger failed");
      setTriggerMessage(message);
      setTriggerMessageType("error");
      toast.error(zh ? "无法执行检查" : "Could not run the check", { description: message, duration: MESSAGE_DURATION_MS });
    } finally {
      setIsTriggering(false);
      setTimeout(() => {
        setTriggerMessage(null);
        setTriggerMessageType(null);
      }, MESSAGE_DURATION_MS);
    }
  }, [selectedScriptId, isTriggering, onTriggered, language, zh]);

  return {
    selectedScriptId,
    setSelectedScriptId,
    selectedCheck,
    isTriggering,
    triggerMessage,
    triggerMessageType,
    handleTriggerCheck,
  };
}
