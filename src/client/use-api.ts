"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiErrorCode, readJson } from "./send-json";

export interface ApiState<T> {
  data: T | null;
  /** The URL `data` came from; differs from the current URL while a new request is in flight. */
  dataUrl: string | null;
  error: string | null;
  /** The API's `error.code` for `error`, when it sent one (see src/client/api-errors.ts). */
  errorCode: string | null;
  loading: boolean;
  /**
   * Fetches again, keeping the current data on screen until the new one arrives.
   * Resolves once that fetch has settled, so a caller can wait for fresh data.
   */
  reload: () => Promise<void>;
}

/** GETs JSON from an API route; errors carry the route's message and code when it sent them. */
export function useApi<T>(url: string | null): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; code: string | null } | null>(null);
  const [version, setVersion] = useState(0);
  // The request that last settled; loading until it is the current one.
  const [settled, setSettled] = useState<string | null>(null);
  const request = url ? `${version} ${url}` : null;
  const loading = request !== null && settled !== request;
  const waiting = useRef<(() => void)[]>([]);
  const hasUrl = useRef(Boolean(url));
  useEffect(() => {
    hasUrl.current = Boolean(url);
  }, [url]);

  useEffect(() => {
    if (!url || !request) return;
    const controller = new AbortController();
    const current = () => !controller.signal.aborted;
    fetch(url, { signal: controller.signal })
      .then((response) => readJson<T>(response))
      .then((body) => {
        // An abort can land while the body is read; a superseded response must not overwrite newer data.
        if (!current()) return;
        setData(body);
        setDataUrl(url);
        setError(null);
      })
      .catch((cause) => {
        if (current()) setError({ message: cause instanceof Error ? cause.message : String(cause), code: apiErrorCode(cause) ?? null });
      })
      .finally(() => {
        if (!current()) return;
        setSettled(request);
        const done = waiting.current;
        waiting.current = [];
        done.forEach((resolve) => resolve());
      });
    // Cancelled on unmount or when a newer request replaces this one; the handlers above ignore it.
    return () => controller.abort();
  }, [url, request]);

  const reload = useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (!hasUrl.current) return resolve();
        waiting.current.push(resolve);
        setVersion((v) => v + 1);
      }),
    [],
  );
  return { data, dataUrl, error: error?.message ?? null, errorCode: error?.code ?? null, loading, reload };
}
