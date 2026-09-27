import { useEffect, useState } from "react";
import type { ExecutionResult } from "./run-report";

/** Loads one run from /api/execution-details; `retry` loads it again. */
export function useRunResult(resultId: string | undefined) {
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!resultId) {
      setError("缺少结果ID参数");
      setLoading(false);
      return;
    }
    fetch(`/api/execution-details/${resultId}`)
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `Error: ${res.status}`);
        }
        return res.json();
      })
      .then((data: ExecutionResult) => {
        setResult(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[run-report] Loading run details failed:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [resultId, retryCount]);

  const retry = () => {
    setLoading(true);
    setError(null);
    setRetryCount((count) => count + 1);
  };

  return { result, loading, error, retry };
}
