import type { Db } from "mongodb";
import { createSemaphore } from "@/server/concurrency/semaphore";
import type { RunCheckResult, RunTrigger } from "./run-check";
import { COLLECTIONS } from "@/lib/database/collections";

import type { BatchItemStatus } from "@/contracts/batches";

export interface BatchItem {
  scriptId: string;
  scriptName: string;
  isScheduled: boolean;
  status: BatchItemStatus;
  startTime?: Date;
  endTime?: Date;
  message?: string;
  findings?: string;
  mongoResultId?: string;
}

/** A batch as the progress panel reads it; stored in MongoDB so any instance can report it. */
export interface Batch {
  executionId: string;
  requestedBy: string;
  scripts: BatchItem[];
  totalScripts: number;
  startedAt: Date;
  completedAt?: Date;
  isActive: boolean;
}

export interface BatchStore {
  create(batch: Batch): Promise<void>;
  get(executionId: string): Promise<Batch | null>;
  updateItem(executionId: string, scriptId: string, fields: Partial<BatchItem>): Promise<void>;
  finish(executionId: string, at: Date): Promise<void>;
}

export function itemStatus(result: RunCheckResult): Pick<BatchItem, "status" | "message" | "findings" | "mongoResultId"> {
  if (result.kind === "missing") return { status: "error", message: "No check with this id" };
  if (result.kind === "busy") {
    return { status: "error", message: "Already running; its result will appear in the run history." };
  }
  return {
    status: result.outcome,
    message: result.message,
    findings: result.findings,
    mongoResultId: result.runId,
  };
}

export const SKIPPED_MESSAGE = "Not run: the batch reached its time limit. Run the remaining checks again.";

/**
 * Runs every check in a batch with bounded concurrency, writing each
 * item's progress as it goes. A failing check never stops the others,
 * and the batch is always marked finished.
 *
 * With a `deadline`, a check starts only while a whole run (`runBudgetMs`)
 * still fits before it; the rest are marked skipped instead of being cut
 * off by the platform mid-run and left "running".
 */
export async function runBatch(
  executionId: string,
  deps: {
    store: BatchStore;
    run: (scriptId: string, trigger: RunTrigger) => Promise<RunCheckResult>;
    now: () => Date;
    concurrency?: number;
    deadline?: Date;
    runBudgetMs?: number;
  },
): Promise<void> {
  const batch = await deps.store.get(executionId);
  if (!batch) return;
  const limit = createSemaphore(Math.max(1, deps.concurrency ?? 3));
  const fits = () => !deps.deadline || deps.now().getTime() + (deps.runBudgetMs ?? 0) <= deps.deadline.getTime();
  try {
    await Promise.all(
      batch.scripts.map((item) =>
        limit.run(async () => {
          if (!fits()) {
            await deps.store.updateItem(executionId, item.scriptId, { status: "skipped", message: SKIPPED_MESSAGE });
            return;
          }
          await deps.store.updateItem(executionId, item.scriptId, { status: "running", startTime: deps.now() });
          let fields: Partial<BatchItem>;
          try {
            fields = itemStatus(await deps.run(item.scriptId, { kind: "batch" }));
          } catch (error) {
            fields = { status: "error", message: error instanceof Error ? error.message : String(error) };
          }
          await deps.store.updateItem(executionId, item.scriptId, { ...fields, endTime: deps.now() });
        }),
      ),
    );
  } finally {
    await deps.store.finish(executionId, deps.now());
  }
}

/**
 * Runs a batch, then sends its alerts. Alerts also go out at `dispatchBy`
 * if the batch is still going then (a run slower than its budget), so a
 * function stopped at its time limit has already sent what it could;
 * anything later goes out with the next dispatch.
 */
export async function runBatchAndDispatch(deps: {
  batch: () => Promise<void>;
  dispatch: () => Promise<unknown>;
  dispatchBy: Date;
  now: () => Date;
  sleep?: (ms: number) => Promise<void>;
}): Promise<void> {
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms).unref?.()));
  const dispatch = () => deps.dispatch().catch((error) => console.error("[Notify] Dispatch failed:", error));
  const finished = deps.batch().then(
    () => "done" as const,
    (error) => (console.error("[Batch] failed:", error), "done" as const),
  );
  const timeUp = sleep(Math.max(0, deps.dispatchBy.getTime() - deps.now().getTime())).then(() => "time" as const);
  if ((await Promise.race([finished, timeUp])) === "time") {
    await dispatch();
    await finished;
  }
  await dispatch();
}

// Batches written before the run-outcome vocabulary stored these statuses.
const LEGACY_STATUS: Record<string, BatchItemStatus> = { completed: "clean", attention_needed: "issues", failed: "error" };

/** An item's status in today's vocabulary, whichever one it was stored in. */
export function currentItemStatus(status: string): BatchItemStatus {
  return LEGACY_STATUS[status] ?? (status as BatchItemStatus);
}

// A batch that never finished (its function was stopped) stops showing as active after this:
// no function lives longer than FUNCTION_MAX_DURATION_S (300 s), so a minute more is plenty.
export const BATCH_STALE_MS = 6 * 60_000;

const STOPPED_MESSAGE = "The batch stopped before this check finished. See the run history, or run it again.";

/** A batch whose function was stopped: its unfinished items never finish, so they show as not run. */
export function asStale(batch: Batch): Batch {
  return {
    ...batch,
    isActive: false,
    scripts: batch.scripts.map((item) =>
      item.status === "pending" || item.status === "running" ? { ...item, status: "skipped", message: STOPPED_MESSAGE } : item,
    ),
  };
}

export function mongoBatchStore(db: Db): BatchStore {
  const batches = db.collection<Batch>(COLLECTIONS.batches);
  return {
    async create(batch) {
      await batches.insertOne({ ...batch });
    },
    async get(executionId) {
      const batch = await batches.findOne({ executionId }, { projection: { _id: 0 } });
      if (!batch) return null;
      batch.scripts = batch.scripts.map((item) => ({ ...item, status: currentItemStatus(item.status) }));
      const stale = batch.isActive && Date.now() - new Date(batch.startedAt).getTime() > BATCH_STALE_MS;
      return stale ? asStale(batch) : batch;
    },
    async updateItem(executionId, scriptId, fields) {
      const set = Object.fromEntries(Object.entries(fields).map(([key, value]) => [`scripts.$.${key}`, value]));
      await batches.updateOne({ executionId, "scripts.scriptId": scriptId }, { $set: set });
    },
    async finish(executionId, at) {
      await batches.updateOne({ executionId }, { $set: { isActive: false, completedAt: at } });
    },
  };
}
