import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/utils";

/**
 * Placeholders that mirror the real page structure (same container, card
 * edges and paddings) so content lands in place instead of shifting.
 */

/**
 * Page headings now live in the window title bar and toolbar, so the page
 * itself reserves no space for one. Kept so skeletons stay in step with pages.
 */
export function SkeletonPageHeader(_props: { withAction?: boolean }) {
  return null;
}

export function SkeletonStatStrip({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-2.5 bg-card px-5 py-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

/** A card with a title bar and table rows; first/last columns use the tables' px-6. */
export function SkeletonTable({
  rows = 6,
  withTitle = true,
  className,
}: {
  rows?: number;
  withTitle?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      {withTitle && (
        <div className="border-b px-6 py-4">
          <Skeleton className="h-5 w-40" />
        </div>
      )}
      <div className="flex h-11 items-center gap-6 border-b px-6">
        {[18, 26, 14, 16].map((w, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${w}%` }} />
        ))}
        <Skeleton className="ml-auto h-3 w-12" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-[52px] items-center gap-6 border-b px-6 last:border-0">
          <Skeleton className="h-3.5" style={{ width: `${14 + ((i * 7) % 10)}%` }} />
          <Skeleton className="h-3.5" style={{ width: `${22 + ((i * 5) % 12)}%` }} />
          <Skeleton className="h-3.5 w-[12%]" />
          <Skeleton className="h-3.5 w-[14%]" />
          <Skeleton className="ml-auto h-7 w-8" />
        </div>
      ))}
    </div>
  );
}

/** Stacked cards, as on the approvals page. */
export function SkeletonCardList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-start justify-between gap-4 rounded-lg border bg-card p-5">
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-80 max-w-[60vw]" />
            <Skeleton className="mt-3 h-3 w-2/3" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Dashboard: header, 8/4 grid (manual run + stats), then run history. */
export function DashboardSkeleton() {
  // Mirrors the dashboard: a row of four status tiles, then the run history.
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl bg-card shadow-border space-y-2  px-4 py-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <SkeletonTable rows={8} withTitle={false} />
    </div>
  );
}
