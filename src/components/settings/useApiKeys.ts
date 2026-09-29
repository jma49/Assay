import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import type { KeyRow } from "./api-keys-copy";

/**
 * The caller's API keys through Better Auth, newest first: null until loaded
 * (never for guests). `create` resolves the new key, shown only once, or null
 * when it failed (reported with a toast).
 */
export function useApiKeys(enabled: boolean, messages: { failed: string; revoked: string }) {
  const [keys, setKeys] = useState<KeyRow[] | null>(null);
  const { failed, revoked } = messages;

  // State is set in the promise callback: the first load runs from an effect.
  const load = useCallback(
    () =>
      authClient.apiKey.list().then(({ data, error }) => {
        if (error) return toast.error(error.message ?? failed);
        setKeys(((data as { apiKeys?: KeyRow[] })?.apiKeys ?? []).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
      }),
    [failed],
  );

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  const create = async (name: string, days: number): Promise<string | null> => {
    const { data, error } = await authClient.apiKey.create({ name: name.trim(), expiresIn: days * 24 * 60 * 60 });
    if (error || !data) {
      toast.error(error?.message ?? failed);
      return null;
    }
    void load();
    return (data as { key: string }).key;
  };

  const revoke = async (key: KeyRow) => {
    const { error } = await authClient.apiKey.delete({ keyId: key.id });
    if (error) return toast.error(error.message ?? failed);
    toast.success(revoked);
    void load();
  };

  return { keys, create, revoke };
}
