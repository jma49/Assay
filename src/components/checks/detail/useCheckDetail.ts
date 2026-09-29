import { useEffect, useState } from "react";
import { toast } from "sonner";
import * as checksApi from "@/client/checks";
import { useApi } from "@/client/use-api";
import type { CheckDetail } from "@/contracts/checks";
import { useMe } from "@/lib/auth/use-me";
import { COPY } from "./copy";

/** Loads one check, names the browser tab after it, and runs it on demand; `onRan` fires after a run finished. */
export function useCheckDetail(scriptId: string, language: "en" | "zh", { onRan }: { onRan?: () => void } = {}) {
  const t = COPY[language];
  const zh = language === "zh";
  const me = useMe();
  const { data, error, loading, reload } = useApi<{ check: CheckDetail }>(`/api/checks/${encodeURIComponent(scriptId)}`);
  const [running, setRunning] = useState(false);
  const check = data?.check;

  // The tab title names the check once it has loaded.
  const title = check ? (zh ? check.cnName || check.name : check.name) : null;
  useEffect(() => {
    if (title) document.title = `${title} · Assay`;
  }, [title]);

  const canRun = !!me && (me.permissions.includes("script:execute") || !!me.demo);
  const canEdit = !!me?.permissions.includes("script:update");
  const canAlert = !!me?.permissions.includes("script:execute");

  const runNow = async () => {
    setRunning(true);
    try {
      const body = await checksApi.runCheck(scriptId);
      // Stay "Running…" until the page shows the new run, so the toast never contradicts it.
      await reload();
      onRan?.();
      if (body.outcome === "error") toast.error(t.ranError, { description: body.message });
      else if (body.outcome === "issues") toast.warning(t.ranIssues(body.rowCount ?? 0));
      else toast.success(t.ranClean);
    } catch (cause) {
      toast.error(t.runFailed, { description: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setRunning(false);
    }
  };

  return { check, error, loading, reload, running, runNow, canRun, canEdit, canAlert };
}
