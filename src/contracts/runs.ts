/** What GET /api/check-history/stats answers: runs counted by outcome. */
export interface CheckStats {
  totalCount: number;
  /** clean */
  successCount: number;
  /** error */
  failureCount: number;
  /** issues */
  needsAttentionCount: number;
}
