import { useCallback, useEffect, useRef, useState } from "react";
import type { SqlScript } from "@/components/business/dashboard/types";

/** Loads every check on mount; `reload` refreshes the list after a change. */
export function useScriptList() {
  const [scripts, setScripts] = useState<SqlScript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetching = useRef(false);

  const reload = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/scripts");
      if (!response.ok) {
        throw new Error(`Failed to fetch scripts: ${response.status}`);
      }
      const scriptsData: SqlScript[] = await response.json();
      setScripts(
        scriptsData.map((s) => ({
          ...s,
          createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
        })),
      );
    } catch (err) {
      console.error("Failed to fetch scripts:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { scripts, isLoading, error, reload };
}
