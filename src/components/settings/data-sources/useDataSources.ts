import { useState } from "react";
import { toast } from "sonner";
import { apiErrorText } from "@/client/api-errors";
import { sendJson } from "@/client/send-json";
import { useApi } from "@/client/use-api";
import type { ConnectionTestDto, DataSourceDto, DataSourcesResponse } from "@/contracts/data-sources";
import type { Copy } from "./copy";
import type { Language } from "./data-sources";

/**
 * The data sources page's data: the list, and testing or deleting a saved
 * source. Each action reloads the list, so the row shows the stored result.
 */
export function useDataSources(language: Language, t: Copy) {
  const api = useApi<DataSourcesResponse>("/api/data-sources");
  const [testing, setTesting] = useState<string | null>(null);

  const test = async (source: DataSourceDto): Promise<ConnectionTestDto | null> => {
    setTesting(source.sourceId);
    try {
      const { test: result } = await sendJson<{ test: ConnectionTestDto }>(`/api/data-sources/${encodeURIComponent(source.sourceId)}/test`, "POST");
      if (result.ok) toast.success(t.resultOk(result.serverVersion ?? "?", result.currentUser ?? "?"));
      else toast.error(t.resultFailed, { description: result.error });
      void api.reload();
      return result;
    } catch (cause) {
      toast.error(apiErrorText(cause, language));
      return null;
    } finally {
      setTesting(null);
    }
  };

  const remove = async (source: DataSourceDto) => {
    try {
      await sendJson(`/api/data-sources/${encodeURIComponent(source.sourceId)}`, "DELETE");
      toast.success(t.removed);
    } catch (cause) {
      toast.error(apiErrorText(cause, language));
    }
    void api.reload();
  };

  return { ...api, testing, test, remove };
}
