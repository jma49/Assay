import { useEffect, useState } from "react";
import { apiErrorText } from "@/client/api-errors";
import { readRunResponse, type ExecutionResult, type Language } from "./run-report";

/** Loads one run from /api/execution-details; `retry` loads it again. */
export function useRunResult(resultId: string | undefined, missingIdMessage: string, language: Language) {
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!resultId) return;
    fetch(`/api/execution-details/${resultId}`)
      .then(readRunResponse)
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[run-report] Loading run details failed:", err);
        setError(err);
        setLoading(false);
      });
  }, [resultId, retryCount]);

  const retry = () => {
    setLoading(true);
    setError(null);
    setRetryCount((count) => count + 1);
  };

  if (!resultId) return { result: null, loading: false, error: missingIdMessage, retry };
  // Localized when shown, so switching the language also switches the message.
  return { result, loading, error: error ? apiErrorText(error, language) : null, retry };
}
