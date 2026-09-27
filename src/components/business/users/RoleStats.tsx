import type { UserRole } from "@/lib/types/approval";
import type { DashboardTranslationKeys } from "@/components/business/dashboard/types";
import { getRoleInfo } from "./members";

interface RoleStatsProps {
  counts: Record<UserRole, number>;
  t: (key: DashboardTranslationKeys) => string;
}

/** One tile per role with how many members hold it. */
export function RoleStats({ counts, t }: RoleStatsProps) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {Object.entries(counts).map(([role, count]) => (
        <div key={role} className="space-y-1 bg-card px-5 py-4">
          <dt className="text-[13px] text-muted-foreground">{getRoleInfo(role as UserRole, t).label}</dt>
          <dd className="text-[24px] leading-tight font-semibold tabular-nums">{count}</dd>
        </div>
      ))}
    </dl>
  );
}
