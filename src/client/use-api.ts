"use client";

import { useCallback, useEffect, useState } from "react";

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** Fetches again, keeping the current data on screen until the new one arrives. */
  reload: () => void;
}

/** GETs JSON from an API route; errors carry the route's message when it sent one. */
export function useApi<T>(url: string | null): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error?.message ?? body?.message ?? response.statusText);
        setData(body as T);
        setError(null);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, loading, reload };
}
