import { DashboardSkeleton } from "@/components/common/PageSkeletons";
import { APP_CONTAINER } from "@/components/layout/app-container";

export default function Loading() {
  return (
    <main className={`${APP_CONTAINER} py-8`} aria-busy="true">
      <DashboardSkeleton />
    </main>
  );
}
