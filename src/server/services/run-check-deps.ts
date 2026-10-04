import type { RunOutcome } from "@/domain/run";
import { ObjectId } from "mongodb";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { createSemaphore } from "@/server/concurrency/semaphore";
import { resolveSource } from "@/server/datasource/sources";
import { mongoRunCheckStore } from "@/server/repos/run-check-store";
import { runCheck, type RunCheckDeps, type RunTrigger } from "./run-check";

/**
 * How long a Vercel function that runs checks may live, in seconds. Fluid
 * Compute (turned on in vercel.json) allows up to 300 s on the Hobby plan
 * (800 s on paid plans); without it Hobby caps functions at 60 s and Vercel
 * refuses the deployment. Assay assumes Hobby. Every route that runs checks exports `maxDuration` with this
 * value (a literal there, because Next.js reads it statically; a test keeps
 * them equal).
 */
export const FUNCTION_MAX_DURATION_S = 300;

/** Time a run needs besides its query: taking the lease, saving the run and state, writing the event. */
export const RUN_OVERHEAD_MS = 15_000;

/** Left over at the end of a function for sending alerts. */
export const DISPATCH_RESERVE_MS = 30_000;

const DEFAULT_TIMEOUT_MS = 30_000;
/** A single run must fit in one function with room to save it and send its alerts. */
export const MAX_TIMEOUT_MS = FUNCTION_MAX_DURATION_S * 1000 - RUN_OVERHEAD_MS - DISPATCH_RESERVE_MS;

/** CHECK_TIMEOUT_MS, clamped to 1 s – MAX_TIMEOUT_MS (255 s); 30 s when unset or invalid. */
export function checkTimeoutMs(env: Record<string, string | undefined> = process.env): number {
  const value = Number(env.CHECK_TIMEOUT_MS);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(value, 1_000), MAX_TIMEOUT_MS);
}

// One limit per process, shared by every request it serves, so a burst of
// runs queues here instead of exhausting the PostgreSQL pool.
const executions = createSemaphore(Math.max(1, Number(process.env.CHECK_CONCURRENCY) || 4));

async function defaultRunCheckDeps(): Promise<RunCheckDeps> {
  const db = await getMongoDbClient().getDb();
  return {
    store: mongoRunCheckStore(db),
    sources: async (sourceId) => (await resolveSource(sourceId)).source,
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

/** What POST /api/run-check answers. */
export interface ExecutionResult {
  success: boolean;
  /** "error" too when the check is missing or already running. */
  outcome: RunOutcome;
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
    return { success: false, outcome: "error", message: "No check with this id", findings: "Check not found", notFound: true };
  }
  if (result.kind === "busy") {
    return {
      success: false,
      outcome: "error",
      message: "This check is already running. Its result will appear in the run history.",
      findings: "Already running",
      alreadyRunning: true,
    };
  }
  return {
    success: result.outcome !== "error",
    outcome: result.outcome,
    message: result.message,
    findings: result.findings,
    mongoResultId: result.runId,
    rowCount: result.rowCount,
  };
}
