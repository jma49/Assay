import type { RunOutcome } from "@/domain/run";

export const ITEMS_PER_PAGE = 10;
export const CHECK_HISTORY_ITEMS_PER_PAGE = 50;

/** One run as GET /api/check-history lists it. */
export interface HistoryRun {
  _id: string;
  checkId: string;
  /** ISO time the run finished. */
  finishedAt: string;
  outcome: RunOutcome;
  /** Null on runs saved before the field existed. */
  rowCount?: number | null;
  error?: string | null;
  message: string;
  findings: string;
  github_run_id?: string | number;
}

export interface CheckListItem {
  scriptId: string;
  name: string;
  description?: string;
  cnName?: string;
  cnDescription?: string;
  scope?: string;
  cnScope?: string;
  author?: string;
  createdAt?: Date | string;
  isScheduled?: boolean;
  cronSchedule?: string;
  sqlContent?: string;
  hashtags?: string[];
}

export interface CheckDefinition {
  _id?: string; // MongoDB ID, optional as it's not present before creation
  scriptId: string;
  name: string;
  cnName?: string;
  description?: string;
  cnDescription?: string;
  scope?: string;
  cnScope?: string;
  author: string;
  sqlContent: string;
  hashtags?: string[];
  isScheduled?: boolean;
  cronSchedule?: string;
  /** The data source it runs against; `default` (DATABASE_URL) when missing. */
  dataSourceId?: string;
  createdAt?: Date | string; // Allow string for API response, Date for client state
  updatedAt?: Date | string; // Allow string for API response, Date for client state
  /** Incremented by every edit; a save sends it back so concurrent edits are caught. */
  version?: number;
}
