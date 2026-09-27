import type { Document } from "mongodb";

export interface CheckStats {
  totalCount: number;
  successCount: number;
  failureCount: number;
  needsAttentionCount: number;
}

/** Runs counted by outcome: clean (success), issues (needs attention) and error (failure). */
export const CHECK_STATS_PIPELINE: Document[] = [
  {
    $group: {
      _id: null,
      totalCount: { $sum: 1 },
      successCount: { $sum: { $cond: [{ $eq: ["$outcome", "clean"] }, 1, 0] } },
      needsAttentionCount: { $sum: { $cond: [{ $eq: ["$outcome", "issues"] }, 1, 0] } },
      failureCount: { $sum: { $cond: [{ $eq: ["$outcome", "error"] }, 1, 0] } },
    },
  },
];

export function toCheckStats(rows: Document[]): CheckStats {
  const row = rows[0] ?? {};
  return {
    totalCount: Number(row.totalCount ?? 0),
    successCount: Number(row.successCount ?? 0),
    failureCount: Number(row.failureCount ?? 0),
    needsAttentionCount: Number(row.needsAttentionCount ?? 0),
  };
}
