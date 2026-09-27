import type { Document } from "mongodb";
import { fromLegacyStatus, toLegacyStatus, type LegacyStatusType, type RunOutcome } from "@/domain/run";

/**
 * The run shape the older history pages (Runs, Analysis, the run report)
 * still read, built from the run's current fields. It goes away when those
 * pages move to the checks pages' vocabulary (#62).
 */
export interface LegacyRunView {
  _id: string;
  script_name: string;
  execution_time: Date;
  status: "success" | "failure";
  statusType: LegacyStatusType;
  message: string;
  findings: string;
  raw_results?: Record<string, unknown>[];
}

export function toLegacyRunView(run: Document, includeRows = false): LegacyRunView {
  const statusType = toLegacyStatus(run.outcome as RunOutcome);
  return {
    _id: String(run._id),
    script_name: run.checkId,
    execution_time: run.finishedAt,
    status: statusType === "failure" ? "failure" : "success",
    statusType,
    message: run.message ?? "",
    findings: run.findings ?? "",
    ...(includeRows && { raw_results: Array.isArray(run.raw_results) ? run.raw_results : [] }),
  };
}

/** The outcome a legacy status filter means, or null for an unknown one. */
export function outcomeFilter(status: string | null): RunOutcome | null {
  if (status !== "success" && status !== "failure" && status !== "attention_needed") return null;
  return fromLegacyStatus(status);
}

/** The run fields the legacy views need, so large ones are only read on request. */
export const LEGACY_VIEW_FIELDS = { checkId: 1, finishedAt: 1, outcome: 1, message: 1, findings: 1 } as const;
