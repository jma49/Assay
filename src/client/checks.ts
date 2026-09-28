import type { RunOutcome } from "@/domain/run";
import type { Triage } from "@/lib/ai/triage";
import { sendJson } from "./send-json";

/** What POST /api/run-check answers for a finished run. */
export interface RunCheckResponse {
  success: boolean;
  outcome: RunOutcome;
  message?: string;
  localizedMessage?: string;
  mongoResultId?: string;
  rowCount?: number;
}

export interface TriageResponse {
  triage?: Triage;
  cached?: boolean;
}

/** Runs one check now; throws with the API's message when the run is refused. */
export function runCheck(scriptId: string): Promise<RunCheckResponse> {
  return sendJson<RunCheckResponse>("/api/run-check", "POST", { scriptId });
}

/** AI triage of one run, in the given language; the server reads the run itself from its id. */
export function triage(runId: string, language: "en" | "zh"): Promise<TriageResponse> {
  return sendJson<TriageResponse>("/api/ai/triage", "POST", { resultId: runId, language });
}
