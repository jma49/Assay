import type { RunOutcome } from "@/domain/run";

/**
 * Where one check of a batch is: waiting, running, finished with a run
 * outcome, or skipped (never started because the batch ran out of time).
 */
export type BatchItemStatus = "pending" | "running" | "skipped" | RunOutcome;


/** One check of a batch as GET /api/batches/[executionId] returns it (times as ISO strings). */
export interface BatchCheckView {
  checkId: string;
  name: string;
  isScheduled: boolean;
  status: BatchItemStatus;
  startTime?: string;
  endTime?: string;
  message?: string;
  findings?: string;
  runId?: string;
}

/** A batch as GET /api/batches/[executionId] returns it in `batch`. */
export interface BatchView {
  executionId: string;
  checks: BatchCheckView[];
  total: number;
  isActive: boolean;
}
