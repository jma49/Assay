import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ScriptExecutionStatus } from "../BatchExecutionProgress";
import type { DashboardTranslationKeys, ScriptInfo } from "../types";
import type { BulkMode } from "./script-search";

const POLL_MS = 2000;

type StatusFromApi = Omit<ScriptExecutionStatus, "startTime" | "endTime"> & { startTime?: string; endTime?: string };

const toStatus = (script: StatusFromApi): ScriptExecutionStatus => ({
  ...script,
  startTime: script.startTime ? new Date(script.startTime) : undefined,
  endTime: script.endTime ? new Date(script.endTime) : undefined,
});

const isAbort = (error: unknown) => error instanceof Error && error.name === "AbortError";

/** Starts a bulk run, polls its progress every two seconds and reports when it ends. */
export function useBatchRun(language: string, t: (key: DashboardTranslationKeys) => string) {
  const [isRunning, setIsRunning] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [scripts, setScripts] = useState<ScriptExecutionStatus[]>([]);
  const [showProgress, setShowProgress] = useState(false);
  const startAbort = useRef<AbortController | null>(null);
  const pollAbort = useRef<AbortController | null>(null);

  const abortAll = () => {
    startAbort.current?.abort();
    pollAbort.current?.abort();
  };

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
        const execution = (await response.json()).data;
        if (!execution?.scripts) return;
        const updated = (execution.scripts as StatusFromApi[]).map(toStatus);
        setScripts(updated);
        if (execution.isActive) return;
        stop();
        const count = (status: ScriptExecutionStatus["status"]) => updated.filter((s) => s.status === status).length;
        const [completed, attention, failed] = [count("completed"), count("attention_needed"), count("failed")];
        toast.success(language === "zh" ? "批量执行完成" : "Batch execution completed", {
          description:
            language === "zh"
              ? `成功: ${completed}, 需要关注: ${attention}, 失败: ${failed}`
              : `Success: ${completed}, Attention: ${attention}, Failed: ${failed}`,
          duration: 5000,
        });
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
        if (!response.ok) throw new Error(result.message || t("batchExecutionFailed"));
        if (result.executionId) {
          setExecutionId(result.executionId);
          setShowProgress(true);
          setScripts(
            targets.map((script) => ({
              scriptId: script.scriptId,
              scriptName: script.name || script.scriptId,
              isScheduled: script.isScheduled || false,
              status: "pending",
            })),
          );
        }
        toast.success(t("batchExecutionStarted"), {
          description: result.localizedMessage || result.message || t("batchExecutionStartedDesc"),
          duration: 5000,
        });
      } catch (error) {
        if (isAbort(error)) return;
        toast.error(t("batchExecutionFailed"), {
          description: error instanceof Error ? error.message : t("batchExecutionFailed"),
          duration: 8000,
        });
        setIsRunning(false);
      }
    },
    [t],
  );

  const close = useCallback(() => {
    abortAll();
    setShowProgress(false);
    setExecutionId(null);
    setScripts([]);
    setIsRunning(false);
  }, []);

  const cancel = useCallback(() => {
    abortAll();
    setIsRunning(false);
    setExecutionId(null);
    toast.info(language === "zh" ? "批量执行已取消" : "Batch execution cancelled", { duration: 3000 });
  }, [language]);

  return { isRunning, scripts, showProgress, start, close, cancel };
}
