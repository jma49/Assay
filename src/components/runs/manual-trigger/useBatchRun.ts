import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiErrorText } from "@/client/api-errors";
import { readJson } from "@/client/send-json";
import type { BatchCheckView, BatchView } from "@/contracts/batches";
import type { CheckListItem } from "../types";
import { triggerCopy } from "./copy";
import { batchCounts } from "./batch-progress";
import type { BulkMode } from "./script-search";

const POLL_MS = 2000;

const isAbort = (error: unknown) => error instanceof Error && error.name === "AbortError";

/** Starts a bulk run, polls its progress every two seconds and reports when it ends. */
export function useBatchRun(language: string) {
  const [isRunning, setIsRunning] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [items, setItems] = useState<BatchCheckView[]>([]);
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
        const response = await fetch(`/api/batches/${encodeURIComponent(executionId)}`, { signal: pollAbort.current.signal });
        if (response.status === 404) return stop();
        if (!response.ok) return;
        const batch = (await response.json()).batch as BatchView | undefined;
        if (!batch?.checks) return;
        setItems(batch.checks);
        if (batch.isActive) return;
        stop();
        const copy = triggerCopy(language);
        const counts = batchCounts(batch.checks);
        toast.success(copy.finished, { description: copy.finishedSummary(counts.clean, counts.issues, counts.error) + (counts.skipped > 0 ? copy.skippedSummary(counts.skipped) : ""), duration: 5000 });
      } catch (error) {
        if (!isAbort(error)) console.error("[batch] Polling the run status failed:", error);
      }
    };

    void poll();
    intervalId = setInterval(() => void poll(), POLL_MS);
    return () => {
      if (intervalId) clearInterval(intervalId);
      pollAbort.current?.abort();
    };
  }, [executionId, isRunning, language]);

  const start = useCallback(
    async (targets: CheckListItem[], mode: BulkMode, filtered: boolean) => {
      const copy = triggerCopy(language);
      startAbort.current?.abort();
      startAbort.current = new AbortController();
      setIsRunning(true);
      try {
        const response = await fetch("/api/batches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, checkIds: targets.map((check) => check.scriptId), filteredExecution: filtered }),
          signal: startAbort.current.signal,
        });
        const result = await readJson<{ executionId?: string }>(response, copy.startFailed);
        if (!result.executionId) throw new Error(copy.startFailed);
        setExecutionId(result.executionId);
        setItems(
          targets.map((check) => ({
            checkId: check.scriptId,
            name: (language === "zh" && check.cnName) || check.name || check.scriptId,
            isScheduled: check.isScheduled || false,
            status: "pending",
          })),
        );
        toast.success(copy.started, { duration: 3000 });
      } catch (error) {
        if (isAbort(error)) return;
        toast.error(copy.startFailed, { description: apiErrorText(error, language === "zh" ? "zh" : "en"), duration: 8000 });
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
