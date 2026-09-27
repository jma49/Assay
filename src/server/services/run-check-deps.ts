import { ObjectId } from "mongodb";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { createSemaphore } from "@/server/concurrency/semaphore";
import { postgresDataSource } from "@/server/datasource/postgres";
import { mongoRunCheckStore } from "@/server/repos/run-check-store";
import { runCheck, type RunCheckDeps, type RunTrigger } from "./run-check";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 300_000;

/** CHECK_TIMEOUT_MS, clamped to 1 s – 5 min; 30 s when unset or invalid. */
export function checkTimeoutMs(env: Record<string, string | undefined> = process.env): number {
  const value = Number(env.CHECK_TIMEOUT_MS);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(value, 1_000), MAX_TIMEOUT_MS);
}

// One limit per process, shared by every request it serves, so a burst of
// runs queues here instead of exhausting the PostgreSQL pool.
const executions = createSemaphore(Math.max(1, Number(process.env.CHECK_CONCURRENCY) || 4));

export async function defaultRunCheckDeps(): Promise<RunCheckDeps> {
  const db = await getMongoDbClient().getDb();
  return {
    store: mongoRunCheckStore(db),
    source: postgresDataSource,
    executions,
    newRunId: () => new ObjectId().toHexString(),
    now: () => new Date(),
    timeoutMs: checkTimeoutMs(),
  };
}

/** Runs a check with the production dependencies. */
export async function runCheckNow(scriptId: string, trigger: RunTrigger) {
  return runCheck(scriptId, trigger, await defaultRunCheckDeps());
}

/** The response shape the run buttons and batch progress already read. */
export interface ExecutionResult {
  success: boolean;
  statusType: "success" | "attention_needed" | "failure";
  message: string;
  findings: string;
  mongoResultId?: string;
  alreadyRunning?: boolean;
  notFound?: boolean;
  /** Rows the query returned; 0 for a failed run. */
  rowCount?: number;
}

export function toExecutionResult(result: Awaited<ReturnType<typeof runCheck>>): ExecutionResult {
  if (result.kind === "missing") {
    return { success: false, statusType: "failure", message: "No check with this id", findings: "Script not found", notFound: true };
  }
  if (result.kind === "busy") {
    return {
      success: false,
      statusType: "failure",
      message: "This check is already running. Its result will appear in the run history.",
      findings: "Already running",
      alreadyRunning: true,
    };
  }
  return {
    success: result.outcome !== "error",
    statusType: result.outcome === "error" ? "failure" : result.outcome === "issues" ? "attention_needed" : "success",
    message: result.message,
    findings: result.findings,
    mongoResultId: result.runId,
    rowCount: result.rowCount,
  };
}
