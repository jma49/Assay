"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/common/LanguageProvider";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { WindowStatusBar } from "@/components/layout/WindowChrome";
import { useApi } from "@/client/use-api";
import { apiErrorCodeText } from "@/client/api-errors";
import type { DestinationDto, DestinationsResponse } from "@/contracts/notifications";
import { CHANNEL_KINDS } from "@/domain/notify";
import { ConnectCard } from "./ConnectCard";
import { DestinationRow } from "./DestinationRow";
import { EditDestinationDialog } from "./EditDestinationDialog";
import { PasteDestinationDialog } from "./PasteDestinationDialog";
import { COPY, type PasteKind } from "./settings-copy";
import { TelegramDialog } from "./TelegramDialog";

/** Settings → Notifications: connect channels and choose what each one hears about. */
export function NotificationSettings() {
  const router = useRouter();
  const search = useSearchParams();
  const { language } = useLanguage();
  const t = COPY[language];
  const { data, error, errorCode, loading, reload } = useApi<DestinationsResponse>("/api/notifications/destinations");
  const [pasteKind, setPasteKind] = useState<PasteKind | null>(null);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [editing, setEditing] = useState<DestinationDto | null>(null);

  // Slack and Discord send the browser back here with the outcome in the query.
  useEffect(() => {
    const connected = search.get("connected");
    const failure = search.get("error");
    if (!connected && !failure) return;
    if (connected) toast.success(t.connected);
    else toast.error(t.oauthError[failure!] ?? t.oauthError.unknown);
    router.replace("/settings/notifications");
  }, [search, router, t]);

  const onTelegramLinked = useCallback(() => reload(), [reload]);

  if (loading && !data) {
    return (
      <div className={`${APP_CONTAINER} space-y-4 py-6`}>
        <div className="skeleton-shimmer h-16 rounded-xl" />
        <div className="skeleton-shimmer h-40 rounded-xl" />
        <div className="skeleton-shimmer h-40 rounded-xl" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className={`${APP_CONTAINER} py-6`}>
        <p className="rounded-xl bg-failure-soft p-4 text-body-sm text-failure">
          {t.loadFailed}: {apiErrorCodeText(errorCode, language) ?? error}
        </p>
      </div>
    );
  }

  const { destinations, setup } = data;

  return (
    <div className={`${APP_CONTAINER} space-y-8 py-6`}>
      <WindowStatusBar>{t.count(destinations.length)}</WindowStatusBar>
      <header className="max-w-2xl space-y-1.5">
        <h1 className="text-display-sm leading-tight font-bold">{t.title}</h1>
        <p className="text-body-md leading-6 text-muted-foreground">{t.intro}</p>
      </header>

      {(!setup.canManage || !setup.secretKey) && (
        <p className="flex items-start gap-2 rounded-xl bg-attention-soft px-4 py-3 text-body-sm text-attention">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {!setup.secretKey && setup.canManage ? t.noKey : t.readOnly}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-body-lg leading-normal font-semibold">{t.connect}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CHANNEL_KINDS.map((kind) => (
            <ConnectCard key={kind} kind={kind} data={data} onPaste={setPasteKind} onTelegram={() => setTelegramOpen(true)} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-body-lg leading-normal font-semibold">{t.destinations}</h2>
        <div className="overflow-hidden rounded-xl bg-card shadow-border">
          {destinations.length === 0 ? (
            <p className="px-4 py-10 text-center text-body-sm text-muted-foreground">{t.none}</p>
          ) : (
            <ul className="divide-y">
              {destinations.map((destination) => (
                <DestinationRow key={destination.id} destination={destination} canManage={setup.canManage} onChanged={reload} onEdit={setEditing} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <PasteDestinationDialog kind={pasteKind} onClose={() => setPasteKind(null)} onCreated={reload} />
      <TelegramDialog open={telegramOpen} onClose={() => setTelegramOpen(false)} onLinked={onTelegramLinked} />
      <EditDestinationDialog destination={editing} onClose={() => setEditing(null)} onSaved={reload} />
    </div>
  );
}
