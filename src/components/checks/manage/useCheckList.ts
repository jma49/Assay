import { useCallback, useEffect, useRef, useState } from "react";
import type { CheckDefinition } from "@/components/business/dashboard/types";

async function fetchChecks(): Promise<CheckDefinition[]> {
  const response = await fetch("/api/checks?view=definitions");
  if (!response.ok) {
    throw new Error(`Could not load the checks: ${response.status}`);
  }
  const { checks: scriptsData }: { checks: CheckDefinition[] } = await response.json();
  return scriptsData.map((s) => ({
    ...s,
    createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
    updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
  }));
}

/** Loads every check on mount; `reload` refreshes the list after a change. */
export function useCheckList() {
  const [scripts, setScripts] = useState<CheckDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  // State is only set once the response is in: the first load runs from an effect, with the loading flag already set.
  const load = useCallback(() => {
    if (isFetching.current) return Promise.resolve();
    isFetching.current = true;
    return fetchChecks()
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
    void load();
  }, [load]);

  return { scripts, isLoading, error, reload };
}
