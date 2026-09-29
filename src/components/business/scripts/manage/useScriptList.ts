import { useCallback, useEffect, useRef, useState } from "react";
import type { SqlScript } from "@/components/business/dashboard/types";

async function fetchScripts(): Promise<SqlScript[]> {
  const response = await fetch("/api/scripts");
  if (!response.ok) {
    throw new Error(`Failed to fetch scripts: ${response.status}`);
  }
  const scriptsData: SqlScript[] = await response.json();
  return scriptsData.map((s) => ({
    ...s,
    createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
    updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
  }));
}

/** Loads every check on mount; `reload` refreshes the list after a change. */
export function useScriptList() {
  const [scripts, setScripts] = useState<SqlScript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  // State is only set once the response is in: the first load runs from an effect, with the loading flag already set.
  const load = useCallback(() => {
    if (isFetching.current) return Promise.resolve();
    isFetching.current = true;
    return fetchScripts()
      .then((list) => {
        setScripts(list);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to fetch scripts:", err);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        setIsLoading(false);
        isFetching.current = false;
      });
  }, []);

  const reload = useCallback(() => {
    if (isFetching.current) return Promise.resolve();
    setIsLoading(true);
    setError(null);
    return load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { scripts, isLoading, error, reload };
}
