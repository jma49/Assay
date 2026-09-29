import type { RunOutcome } from "@/domain/run";

/** Where one check of a batch is: waiting, running, or finished with a run outcome. */
export type BatchItemStatus = "pending" | "running" | RunOutcome;

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
