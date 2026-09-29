import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiErrorText } from "@/client/api-errors";
import { sendJson } from "@/client/send-json";
import type { DestinationDto } from "@/contracts/notifications";
import { COPY } from "./settings-copy";

/**
 * Pausing, testing and removing one destination. `enabled` flips at once and
 * flips back if the server refuses; `onChanged` reloads the list after each.
 */
export function useDestinationActions(destination: DestinationDto, language: "en" | "zh", onChanged: () => void) {
  const t = COPY[language];
  const [enabled, setEnabled] = useState(destination.enabled);
  const [testing, setTesting] = useState(false);
  const url = `/api/notifications/destinations/${destination.id}`;

  useEffect(() => setEnabled(destination.enabled), [destination.enabled]);

  const toggle = async (next: boolean) => {
    setEnabled(next);
    try {
      await sendJson(url, "PATCH", { enabled: next });
      onChanged();
    } catch (cause) {
      setEnabled(!next);
      toast.error(apiErrorText(cause, language));
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const result = await sendJson<{ ok: boolean; error: string | null }>(`${url}/test`, "POST");
      if (result.ok) toast.success(t.testSent);
      else toast.error(t.testFailed(result.error ?? ""));
      onChanged();
    } catch (cause) {
      toast.error(apiErrorText(cause, language));
    } finally {
      setTesting(false);
    }
  };

  const remove = async () => {
    try {
      await sendJson(url, "DELETE");
      toast.success(t.removed);
      onChanged();
    } catch (cause) {
      toast.error(apiErrorText(cause, language));
    }
  };

  return { enabled, testing, toggle, test, remove };
}
