import { NotFoundState } from "@/components/common/NotFoundState";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { Button } from "@/components/ui/button";
import type { RunReportMessages } from "./messages";

export function RunReportSkeleton() {
  return (
    <div className={`${APP_CONTAINER} space-y-4 py-6`} aria-busy="true">
      <div className="skeleton-shimmer h-10 rounded-sm" />
      <div className="skeleton-shimmer h-20 rounded-sm" />
      <div className="skeleton-shimmer h-72 rounded-sm" />
      <div className="skeleton-shimmer h-40 rounded-sm" />
    </div>
  );
}

export function RunLoadError({ error, t, onRetry }: { error: string; t: RunReportMessages; onRetry: () => void }) {
  return (
    <div className={`${APP_CONTAINER} py-16 text-center`}>
      <p className="text-body-md font-medium">{t.loadingFailed}</p>
      <p className="mt-1 text-body-sm text-ink-2">{error}</p>
      <Button size="sm" variant="outline" className="mt-4" onClick={onRetry}>
        {t.retry}
      </Button>
    </div>
  );
}

export function RunNotFound({ t }: { t: RunReportMessages }) {
  return <NotFoundState title={t.notFound} backHref="/runs" backLabel={t.backToRuns} />;
}
