"use client";

import { useState, useSyncExternalStore } from "react";
import { Plus } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { PageHeader } from "@/components/layout/PageHeader";
import { WindowStatusBar, WindowToolbar } from "@/components/layout/WindowChrome";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/auth/use-me";
import { ApiKeyRow } from "./ApiKeyRow";
import { COPY, type KeyRow } from "./api-keys-copy";
import { ConnectedApps } from "./ConnectedApps";
import { CreateKeyDialog } from "./CreateKeyDialog";
import { Endpoint } from "./KeySnippets";
import { useApiKeys } from "./useApiKeys";

const noChanges = () => () => {};

/** Settings → API keys: personal keys for the MCP server. */
export function ApiKeysSettings() {
  const { language } = useLanguage();
  const t = COPY[language];
  const me = useMe();
  const { keys, create, revoke } = useApiKeys(Boolean(me && !me.guest), t);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<KeyRow | null>(null);
  // The full URL is only known in the browser; the server and hydration use the path, so their HTML matches.
  const endpoint = useSyncExternalStore(noChanges, () => `${window.location.origin}/api/mcp`, () => "/api/mcp");

  if (me?.guest) {
    return (
      <div className={`${APP_CONTAINER} py-6`}>
        <p className="rounded-xl bg-muted p-4 text-body-sm text-muted-foreground">{t.guest}</p>
      </div>
    );
  }

  return (
    <div className={`${APP_CONTAINER} space-y-5 py-6`}>
      <PageHeader title={t.title} />
      {keys && <WindowStatusBar>{t.count(keys.length)}</WindowStatusBar>}
      <WindowToolbar>
        <Button onClick={() => setCreating(true)}>
          <Plus />
          {t.create}
        </Button>
      </WindowToolbar>

      <div className="space-y-1.5">
        <Endpoint url={endpoint} />
        <p className="max-w-2xl text-body-sm leading-6 text-muted-foreground">{t.intro}</p>
      </div>

      <div className="overflow-hidden rounded-xl bg-card shadow-border">
        {keys === null ? (
          <div className="skeleton-shimmer h-24" />
        ) : keys.length === 0 ? (
          <p className="px-4 py-10 text-center text-body-sm text-muted-foreground">{t.none}</p>
        ) : (
          <ul className="divide-y">
            {keys.map((key) => (
              <ApiKeyRow key={key.id} apiKey={key} language={language} onRevoke={setRevoking} />
            ))}
          </ul>
        )}
      </div>

      <ConnectedApps />

      <CreateKeyDialog open={creating} onOpenChange={setCreating} language={language} endpoint={endpoint} create={create} />

      <AlertDialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.revokeTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.revokeBody(revoking?.name || "—")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:brightness-110" onClick={() => revoking && void revoke(revoking)}>
              {t.revoke}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
