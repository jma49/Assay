import { NotFoundState } from "@/components/common/NotFoundState";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { Button } from "@/components/ui/button";
import type { RunReportMessages } from "./messages";

export function RunReportSkeleton() {
  return (
    <div className={`${APP_CONTAINER} space-y-5 py-6`} aria-busy="true">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <div className="skeleton-shimmer h-24 rounded-xl" />
          <div className="skeleton-shimmer h-72 rounded-xl" />
        </div>
        <div className="skeleton-shimmer h-64 rounded-xl lg:col-span-4" />
      </div>
    </div>
  );
}

export function RunLoadError({ error, t, onRetry }: { error: string; t: RunReportMessages; onRetry: () => void }) {
  return (
    <div className={`${APP_CONTAINER} py-16 text-center`}>
      <p className="text-body-md font-medium">{t.loadingFailed}</p>
      <p className="mt-1 text-body-sm text-muted-foreground">{error}</p>
      <Button size="sm" variant="outline" className="mt-4" onClick={onRetry}>
        {t.retry}
      </Button>
    </div>
  );
}

export function RunNotFound({ t }: { t: RunReportMessages }) {
  return <NotFoundState title={t.notFound} backHref="/runs" backLabel={t.backToRuns} />;
}
