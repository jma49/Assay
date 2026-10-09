"use client";

import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { apiErrorCodeText } from "@/client/api-errors";
import { useLanguage } from "@/components/common/LanguageProvider";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { WindowStatusBar } from "@/components/layout/WindowChrome";
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
import type { DataSourceDto } from "@/contracts/data-sources";
import { COPY } from "./copy";
import { DataSourceDialog } from "./DataSourceDialog";
import { DataSourceRow } from "./DataSourceRow";
import { sourceName } from "./data-sources";
import { useDataSources } from "./useDataSources";

/** Settings → Data sources: the databases checks run against. Everyone may look; admins add, test, edit and delete. */
export function DataSourcesSettings() {
  const { language } = useLanguage();
  const t = COPY[language];
  const { data, error, errorCode, loading, reload, testing, test, remove } = useDataSources(language, t);
  const [dialog, setDialog] = useState<{ open: boolean; editing: DataSourceDto | null }>({ open: false, editing: null });
  const [deleting, setDeleting] = useState<DataSourceDto | null>(null);

  if (loading && !data) {
    return (
      <div className={`${APP_CONTAINER} space-y-4 py-6`}>
        <div className="skeleton-shimmer h-16 rounded-xl" />
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

  const { sources, setup } = data;
  const canAdd = setup.canManage && setup.secretKey;

  return (
    <div className={`${APP_CONTAINER} space-y-8 py-6`}>
      <WindowStatusBar>{t.count(sources.length)}</WindowStatusBar>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl space-y-1.5">
          <h1 className="font-editorial text-display-sm">{t.title}</h1>
          <p className="text-body-md text-muted-foreground">{t.intro}</p>
        </div>
        {setup.canManage && (
          <Button onClick={() => setDialog({ open: true, editing: null })} disabled={!canAdd}>
            <Plus />
            {t.add}
          </Button>
        )}
      </header>

      {(!setup.canManage || !setup.secretKey) && (
        <p className="flex items-start gap-2 rounded-xl bg-attention-soft px-4 py-3 text-body-sm text-attention">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {setup.canManage ? t.noKey : t.readOnly}
        </p>
      )}

      <div className="overflow-hidden rounded-xl bg-card shadow-border">
        {sources.length === 0 ? (
          <p className="px-4 py-10 text-center text-body-sm text-muted-foreground">{t.none}</p>
        ) : (
          <ul className="divide-y">
            {sources.map((source) => (
              <DataSourceRow
                key={source.sourceId}
                source={source}
                canManage={setup.canManage}
                testing={testing === source.sourceId}
                language={language}
                t={t}
                onTest={() => void test(source)}
                onEdit={() => setDialog({ open: true, editing: source })}
                onDelete={() => setDeleting(source)}
              />
            ))}
          </ul>
        )}
      </div>

      <DataSourceDialog
        open={dialog.open}
        editing={dialog.editing}
        language={language}
        t={t}
        onClose={() => setDialog((current) => ({ ...current, open: false }))}
        onSaved={() => void reload()}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.removeTitle(deleting ? sourceName(deleting, language) : "")}</AlertDialogTitle>
            <AlertDialogDescription>{deleting && deleting.checkCount > 0 ? t.removeBlocked(deleting.checkCount) : t.removeBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {deleting && deleting.checkCount > 0 ? (
              // Nothing to confirm while checks use it: the server would refuse.
              <AlertDialogCancel>{t.close}</AlertDialogCancel>
            ) : (
              <>
                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:brightness-110"
                  onClick={() => deleting && void remove(deleting)}
                >
                  {t.remove}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
