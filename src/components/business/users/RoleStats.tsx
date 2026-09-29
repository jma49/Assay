import { StatStrip } from "@/components/checks/StatStrip";
import type { UserRole } from "@/lib/types/approval";
import type { DashboardTranslationKeys } from "@/components/business/dashboard/types";
import { getRoleInfo } from "./members";

interface RoleStatsProps {
  counts: Record<UserRole, number>;
  t: (key: DashboardTranslationKeys) => string;
  label: string;
}

/** One tile per role with how many members hold it, in the same strip as the Checks and Runs numbers. */
export function RoleStats({ counts, t, label }: RoleStatsProps) {
  const tiles = Object.entries(counts).map(([role, count]) => ({
    key: role,
    label: getRoleInfo(role as UserRole, t).label,
    value: count,
  }));
  return <StatStrip tiles={tiles} label={label} />;
}
