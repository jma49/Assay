import { after } from "next/server";
import { randomUUID } from "node:crypto";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { COLLECTIONS } from "@/lib/database/collections";
import { ApiError, type Principal } from "@/server/http/route";
import { mongoBatchStore, runBatch, runBatchAndDispatch } from "@/server/services/batches";
import { dispatchNow } from "@/server/services/notify-deps";
import { checkTimeoutMs, DISPATCH_RESERVE_MS, FUNCTION_MAX_DURATION_S, RUN_OVERHEAD_MS, runCheckNow } from "@/server/services/run-check-deps";

export interface BatchRequest {
  mode: "all" | "scheduled";
  checkIds: string[];
  filteredExecution: boolean;
}

/**
 * Starts a batch and returns at once; the checks run after the response
 * (after() keeps the function alive until they finish), and progress is
 * read from MongoDB. All of it must fit in one function: checks start only
 * while a whole run still fits before the deadline, the rest are marked
 * skipped, and alerts are sent in the time kept back at the end.
 */
export async function startBatch(principal: Principal, { mode, checkIds, filteredExecution }: BatchRequest) {
  const startedAt = Date.now();
  const deadline = new Date(startedAt + FUNCTION_MAX_DURATION_S * 1000 - DISPATCH_RESERVE_MS);
  const db = await getMongoDbClient().getDb();

  const filter = filteredExecution && checkIds.length > 0 ? { scriptId: { $in: checkIds } } : mode === "scheduled" ? { isScheduled: true } : {};
  const checks = await db
    .collection(COLLECTIONS.checks)
    .find(filter, { projection: { scriptId: 1, name: 1, isScheduled: 1 } })
    .sort({ createdAt: 1 })
    .toArray();

  if (checks.length === 0) {
    throw new ApiError(404, "no_checks", filteredExecution ? "None of the selected checks exist" : "There are no checks to run");
  }

  const executionId = randomUUID();
  const store = mongoBatchStore(db);
  await store.create({
    executionId,
    requestedBy: principal.email || principal.id,
    scripts: checks.map((check) => ({
      scriptId: String(check.scriptId),
      scriptName: String(check.name ?? check.scriptId),
      isScheduled: Boolean(check.isScheduled),
      status: "pending",
    })),
    totalScripts: checks.length,
    startedAt: new Date(),
    isActive: true,
  });

  const now = () => new Date();
  after(() =>
    runBatchAndDispatch({
      batch: () => runBatch(executionId, { store, run: runCheckNow, now, deadline, runBudgetMs: checkTimeoutMs() + RUN_OVERHEAD_MS }),
      dispatch: dispatchNow,
      dispatchBy: deadline,
      now,
    }),
  );

  return { executionId, checkIds: checks.map((check) => String(check.scriptId)) };
}
