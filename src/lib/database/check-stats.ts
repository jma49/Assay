import type { Document } from "mongodb";

export interface CheckStats {
  totalCount: number;
  successCount: number;
  failureCount: number;
  needsAttentionCount: number;
}

// "attention_needed" results are stored with status "success", so they are
// excluded from the success bucket to keep the three buckets disjoint.
export const CHECK_STATS_PIPELINE: Document[] = [
  {
    $group: {
      _id: null,
      totalCount: { $sum: 1 },
      needsAttentionCount: {
        $sum: { $cond: [{ $eq: ["$statusType", "attention_needed"] }, 1, 0] },
      },
      successCount: {
        $sum: {
          $cond: [
            {
              $and: [
                { $eq: ["$status", "success"] },
                { $ne: ["$statusType", "attention_needed"] },
              ],
            },
            1,
            0,
          ],
        },
      },
      failureCount: {
        $sum: { $cond: [{ $eq: ["$status", "failure"] }, 1, 0] },
      },
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
