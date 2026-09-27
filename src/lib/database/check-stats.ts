import type { Collection, Document } from "mongodb";

export interface CheckStats {
  totalCount: number;
  successCount: number;
  failureCount: number;
  needsAttentionCount: number;
}

/**
 * Runs counted by outcome: clean (success), issues (needs attention) and
 * error (failure). Three counts on the (outcome, finishedAt) index read no
 * run documents, where a $group would load every stored run and its sample.
 */
export async function countRunsByOutcome(runs: Pick<Collection<Document>, "countDocuments">): Promise<CheckStats> {
  const [successCount, needsAttentionCount, failureCount] = await Promise.all(
    (["clean", "issues", "error"] as const).map((outcome) => runs.countDocuments({ outcome })),
  );
  return { totalCount: successCount + needsAttentionCount + failureCount, successCount, failureCount, needsAttentionCount };
}
