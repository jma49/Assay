import { useMemo } from "react";
import { useApi } from "@/client/use-api";
import type { DataSourcesResponse } from "@/contracts/data-sources";
import { sourceName, type Language } from "@/components/settings/data-sources/data-sources";

export interface DataSourceOption {
  sourceId: string;
  label: string;
}

/**
 * The sources a check can run against, named in the reader's language; an
 * empty list until loaded (or when the list cannot be read), so pickers stay
 * hidden rather than flash.
 */
export function useDataSourceOptions(language: Language, enabled = true): DataSourceOption[] {
  const { data } = useApi<DataSourcesResponse>(enabled ? "/api/data-sources" : null);
  return useMemo(
    () => (data?.sources ?? []).map((source) => ({ sourceId: source.sourceId, label: sourceName(source, language) })),
    [data, language],
  );
}

/**
 * The source a form should show: its own when it is one of the options,
 * otherwise the first option (e.g. DATABASE_URL is unset, so there is no
 * `default`). Unchanged while the options are still loading.
 */
export function pickSource(current: string, options: DataSourceOption[]): string {
  if (options.length === 0 || options.some((option) => option.sourceId === current)) return current;
  return options[0].sourceId;
}
