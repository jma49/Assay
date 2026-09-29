import type { RunOutcome } from "@/domain/run";

/**
 * Where one check of a batch is: waiting, running, finished with a run
 * outcome, or skipped (never started because the batch ran out of time).
 */
export type BatchItemStatus = "pending" | "running" | "skipped" | RunOutcome;

/** One check of a batch as GET /api/batch-execution-status returns it (times as ISO strings). */
export interface BatchItemView {
  scriptId: string;
  scriptName: string;
  isScheduled: boolean;
  status: BatchItemStatus;
  startTime?: string;
  endTime?: string;
  message?: string;
  findings?: string;
  mongoResultId?: string;
}

/** A batch as GET /api/batch-execution-status returns it in `data`. */
export interface BatchView {
  executionId: string;
  scripts: BatchItemView[];
  totalScripts: number;
  isActive: boolean;
}
