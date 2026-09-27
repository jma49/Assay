import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkeletonPageHeader, SkeletonTable } from "@/components/common/PageSkeletons";
import { Skeleton } from "@/components/ui/skeleton";
import type { RunReportMessages } from "./messages";

export function RunReportSkeleton() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8" aria-busy="true">
      <SkeletonPageHeader />
      <Skeleton className="h-[88px] rounded-lg" />
      <Skeleton className="h-[300px] rounded-lg" />
      <SkeletonTable rows={5} />
    </main>
  );
}

export function RunLoadError({
  error,
  t,
  onRetry,
  onBack,
}: {
  error: string;
  t: RunReportMessages;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen    ">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-failure/10 rounded-lg text-center p-8">
          <h2 className="text-2xl font-bold text-failure mb-4">
            {t.loadingFailed}
          </h2>
          <p className="text-lg text-failure mb-6">
            {error}
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary dark:bg-[var(--primary)] dark:text-[var(--primary-foreground)] dark:hover:brightness-90 transition"
            >
              {t.retry}
            </button>
            <Button
              onClick={onBack}
              variant="outline"
              className="dark:text-[var(--primary)] dark:border-[var(--primary)] dark:hover:bg-[var(--primary)]/10"
            >
              <Home className="h-4 w-4 mr-2" />
              {t.back}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RunNotFound({
  resultId,
  t,
  onBack,
}: {
  resultId: string | undefined;
  t: RunReportMessages;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen    ">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-attention/10 rounded-lg text-center p-8">
          <h2 className="text-2xl font-bold text-attention ">
            {t.notFound}
          </h2>
          <p className="mt-4 text-foreground ">
            {t.noResultFound} {resultId} 的执行结果。
          </p>
          <Button
            onClick={onBack}
            className="mt-6 dark:text-[var(--primary)] dark:border-[var(--primary)] dark:hover:bg-[var(--primary)]/10"
            variant="outline"
          >
            <Home className="h-4 w-4 mr-2" />
            {t.back}
          </Button>
        </div>
      </div>
    </div>
  );
}
