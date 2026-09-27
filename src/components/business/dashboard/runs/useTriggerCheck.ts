import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { runCheck } from "@/client/checks";
import type { ScriptInfo } from "../types";
import { triggerErrorMessage } from "./runs";

const MESSAGE_DURATION_MS = 8000;

/** The check picked in the Run sheet and a single run of it; `onTriggered` refreshes the page afterwards. */
export function useTriggerCheck(availableScripts: ScriptInfo[], onTriggered: () => Promise<void>) {
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);
  const [triggerMessageType, setTriggerMessageType] = useState<"success" | "error" | null>(null);

  // Default to the first check, and clear the choice when the list empties.
  useEffect(() => {
    if (!selectedScriptId && availableScripts.length > 0) {
      setSelectedScriptId(availableScripts[0].scriptId);
    } else if (selectedScriptId && availableScripts.length === 0) {
      setSelectedScriptId("");
    }
  }, [availableScripts, selectedScriptId]);

  const selectedScript = useMemo(
    () => availableScripts.find((script) => script.scriptId === selectedScriptId),
    [availableScripts, selectedScriptId],
  );

  const handleTriggerCheck = useCallback(async () => {
    if (!selectedScriptId || isTriggering) return;
    setIsTriggering(true);
    setTriggerMessage(null);
    setTriggerMessageType(null);

    try {
      const result = await runCheck(selectedScriptId);

      const successMessage = result.localizedMessage || result.message || "Script triggered successfully";
      setTriggerMessage(successMessage);
      setTriggerMessageType("success");
      toast.success("Trigger Success", { description: successMessage, duration: 5000 });
      await onTriggered();
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("Failed to trigger check:", err);
      const message = triggerErrorMessage(err);
      setTriggerMessage(message);
      setTriggerMessageType("error");
      toast.error("Trigger Failed", { description: message, duration: MESSAGE_DURATION_MS });
    } finally {
      setIsTriggering(false);
      setTimeout(() => {
        setTriggerMessage(null);
        setTriggerMessageType(null);
      }, MESSAGE_DURATION_MS);
    }
  }, [selectedScriptId, isTriggering, onTriggered]);

  return {
    selectedScriptId,
    setSelectedScriptId,
    selectedScript,
    isTriggering,
    triggerMessage,
    triggerMessageType,
    handleTriggerCheck,
  };
}
