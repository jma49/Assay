"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ApiState<T> {
  data: T | null;
  /** The URL `data` came from; differs from the current URL while a new request is in flight. */
  dataUrl: string | null;
  error: string | null;
  loading: boolean;
  /**
   * Fetches again, keeping the current data on screen until the new one arrives.
   * Resolves once that fetch has settled, so a caller can wait for fresh data.
   */
  reload: () => Promise<void>;
}

/** GETs JSON from an API route; errors carry the route's message when it sent one. */
export function useApi<T>(url: string | null): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [version, setVersion] = useState(0);
  const waiting = useRef<(() => void)[]>([]);
  const hasUrl = useRef(Boolean(url));
  hasUrl.current = Boolean(url);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const current = () => !controller.signal.aborted;
    setLoading(true);
    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        // An abort can land while the body is read; a superseded response must not overwrite newer data.
        if (!current()) return;
        if (!response.ok) throw new Error(body?.error?.message ?? body?.message ?? response.statusText);
        setData(body as T);
        setDataUrl(url);
        setError(null);
      })
      .catch((cause) => {
        if (current()) setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (!current()) return;
        setLoading(false);
        const settled = waiting.current;
        waiting.current = [];
        settled.forEach((resolve) => resolve());
      });
    // Cancelled on unmount or when a newer request replaces this one; the handlers above ignore it.
    return () => controller.abort();
  }, [url, version]);

  const reload = useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (!hasUrl.current) return resolve();
        waiting.current.push(resolve);
        setVersion((v) => v + 1);
      }),
    [],
  );
  return { data, dataUrl, error, loading, reload };
}
