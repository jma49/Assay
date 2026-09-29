import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { BatchItemView, BatchView } from "@/contracts/batches";
import type { ScriptInfo } from "../types";
import { triggerCopy } from "./copy";
import { batchCounts } from "./batch-progress";
import type { BulkMode } from "./script-search";

const POLL_MS = 2000;

const isAbort = (error: unknown) => error instanceof Error && error.name === "AbortError";

/** Starts a bulk run, polls its progress every two seconds and reports when it ends. */
export function useBatchRun(language: string) {
  const [isRunning, setIsRunning] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [items, setItems] = useState<BatchItemView[]>([]);
  const startAbort = useRef<AbortController | null>(null);
  const pollAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!executionId || !isRunning) return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (intervalId) clearInterval(intervalId);
      setIsRunning(false);
    };

    const poll = async () => {
      try {
        pollAbort.current?.abort();
        pollAbort.current = new AbortController();
        const response = await fetch(`/api/batch-execution-status?executionId=${executionId}`, { signal: pollAbort.current.signal });
        if (response.status === 404) return stop();
        if (!response.ok) return;
        const batch = (await response.json()).data as BatchView | undefined;
        if (!batch?.scripts) return;
        setItems(batch.scripts);
        if (batch.isActive) return;
        stop();
        const copy = triggerCopy(language);
        const counts = batchCounts(batch.scripts);
        toast.success(copy.finished, { description: copy.finishedSummary(counts.clean, counts.issues, counts.error) + (counts.skipped > 0 ? copy.skippedSummary(counts.skipped) : ""), duration: 5000 });
      } catch (error) {
        if (!isAbort(error)) console.error("[batch] Polling the run status failed:", error);
      }
    };

    poll();
    intervalId = setInterval(poll, POLL_MS);
    return () => {
      if (intervalId) clearInterval(intervalId);
      pollAbort.current?.abort();
    };
  }, [executionId, isRunning, language]);

  const start = useCallback(
    async (targets: ScriptInfo[], mode: BulkMode, filtered: boolean) => {
      const copy = triggerCopy(language);
      startAbort.current?.abort();
      startAbort.current = new AbortController();
      setIsRunning(true);
      try {
        const response = await fetch("/api/run-all-scripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, scriptIds: targets.map((script) => script.scriptId), filteredExecution: filtered }),
          signal: startAbort.current.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.executionId) throw new Error(result.message || copy.startFailed);
        setExecutionId(result.executionId);
        setItems(
          targets.map((script) => ({
            scriptId: script.scriptId,
            scriptName: (language === "zh" && script.cnName) || script.name || script.scriptId,
            isScheduled: script.isScheduled || false,
            status: "pending",
          })),
        );
        toast.success(copy.started, { duration: 3000 });
      } catch (error) {
        if (isAbort(error)) return;
        toast.error(copy.startFailed, { description: error instanceof Error ? error.message : undefined, duration: 8000 });
        setIsRunning(false);
      }
    },
    [language],
  );

  /** Stops following the batch; the server still finishes the checks it started. */
  const stopFollowing = useCallback(() => {
    startAbort.current?.abort();
    pollAbort.current?.abort();
    setIsRunning(false);
    toast.info(triggerCopy(language).stopped, { duration: 4000 });
  }, [language]);

  const reset = useCallback(() => {
    setExecutionId(null);
    setItems([]);
  }, []);

  return { isRunning, items, started: executionId !== null, start, stopFollowing, reset };
}
