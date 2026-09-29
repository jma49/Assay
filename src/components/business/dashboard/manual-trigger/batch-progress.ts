import type { BatchItemStatus, BatchItemView } from "@/contracts/batches";
import type { RunOutcome } from "@/domain/run";

/** The run outcome of an item that ran, or null while it waits or runs, or when it was skipped. */
export function itemOutcome(status: BatchItemStatus): RunOutcome | null {
  return status === "pending" || status === "running" || status === "skipped" ? null : status;
}

/** How many items of a batch are in each status, and how many have finished. */
export function batchCounts(items: Pick<BatchItemView, "status">[]): Record<BatchItemStatus, number> & { done: number } {
  const counts = { pending: 0, running: 0, skipped: 0, clean: 0, issues: 0, error: 0 };
  for (const item of items) counts[item.status]++;
  return { ...counts, done: counts.clean + counts.issues + counts.error + counts.skipped };
}
