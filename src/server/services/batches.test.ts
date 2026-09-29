import { describe, expect, it, vi } from "vitest";
import { asStale, currentItemStatus, runBatch, runBatchAndDispatch, SKIPPED_MESSAGE, type Batch, type BatchItem, type BatchStore } from "./batches";
import type { RunCheckResult } from "./run-check";

function memoryStore(batch: Batch) {
  const updates: [string, Partial<BatchItem>][] = [];
  const store: BatchStore = {
    create: vi.fn(),
    async get(id) {
      return id === batch.executionId ? batch : null;
    },
    async updateItem(_id, scriptId, fields) {
      updates.push([scriptId, fields]);
      Object.assign(batch.scripts.find((s) => s.scriptId === scriptId)!, fields);
    },
    async finish(_id, at) {
      batch.isActive = false;
      batch.completedAt = at;
    },
  };
  return { store, updates };
}

const batchOf = (ids: string[]): Batch => ({
  executionId: "b1",
  requestedBy: "ann@example.com",
  scripts: ids.map((scriptId) => ({ scriptId, scriptName: scriptId, isScheduled: false, status: "pending" })),
  totalScripts: ids.length,
  startedAt: new Date(),
  isActive: true,
});

const completed = (outcome: "clean" | "issues" | "error"): RunCheckResult => ({
  kind: "completed",
  runId: `run-${outcome}`,
  outcome,
  rowCount: outcome === "issues" ? 2 : 0,
  diff: null,
  message: outcome,
  findings: outcome,
  stateUpdated: true,
});

describe("runBatch", () => {
  it("records each check's result and finishes the batch", async () => {
    const batch = batchOf(["a", "b", "c", "d"]);
    const { store } = memoryStore(batch);
    const results: Record<string, RunCheckResult> = {
      a: completed("clean"),
      b: completed("issues"),
      c: completed("error"),
      d: { kind: "busy", runId: "x" },
    };
    await runBatch("b1", { store, run: async (id) => results[id], now: () => new Date() });
    expect(batch.scripts.map((s) => [s.scriptId, s.status])).toEqual([
      ["a", "clean"],
      ["b", "issues"],
      ["c", "error"],
      ["d", "error"],
    ]);
    expect(batch.scripts[1].mongoResultId).toBe("run-issues");
    expect(batch.isActive).toBe(false);
  });

  it("keeps going when a run throws, and still finishes the batch", async () => {
    const batch = batchOf(["a", "b"]);
    const { store } = memoryStore(batch);
    await runBatch("b1", {
      store,
      run: async (id) => {
        if (id === "a") throw new Error("mongo down");
        return completed("clean");
      },
      now: () => new Date(),
    });
    expect(batch.scripts.map((s) => s.status)).toEqual(["error", "clean"]);
    expect(batch.scripts[0].message).toBe("mongo down");
    expect(batch.isActive).toBe(false);
  });

  it("marks each item running before its result arrives", async () => {
    const batch = batchOf(["a"]);
    const { store, updates } = memoryStore(batch);
    await runBatch("b1", { store, run: async () => completed("clean"), now: () => new Date() });
    expect(updates.map(([, f]) => f.status)).toEqual(["running", "clean"]);
  });
});

describe("the time limit", () => {
  it("starts a check only while a whole run fits before the deadline, and marks the rest skipped", async () => {
    const batch = batchOf(["a", "b", "c", "d"]);
    const { store } = memoryStore(batch);
    const clock = { t: 0 };
    const ran: string[] = [];
    await runBatch("b1", {
      store,
      concurrency: 1,
      now: () => new Date(clock.t),
      deadline: new Date(100_000),
      runBudgetMs: 45_000,
      run: async (id) => {
        ran.push(id);
        clock.t += 30_000;
        return completed("clean");
      },
    });
    // a starts at 0 s, b at 30 s; c would start at 60 s and could end past 100 s.
    expect(ran).toEqual(["a", "b"]);
    expect(batch.scripts.map((s) => s.status)).toEqual(["clean", "clean", "skipped", "skipped"]);
    expect(batch.scripts[2].message).toBe(SKIPPED_MESSAGE);
    expect(batch.isActive).toBe(false);
  });

  it("shows a batch whose function was stopped as finished, with its unfinished checks not run", () => {
    const batch = batchOf(["a", "b", "c"]);
    batch.scripts[0].status = "clean";
    batch.scripts[1].status = "running";
    const stale = asStale(batch);
    expect(stale.isActive).toBe(false);
    expect(stale.scripts.map((s) => s.status)).toEqual(["clean", "skipped", "skipped"]);
  });
});

describe("runBatchAndDispatch", () => {
  const never = () => new Promise<void>(() => {});

  it("dispatches once the batch ends", async () => {
    const dispatch = vi.fn(async () => null);
    await runBatchAndDispatch({ batch: async () => {}, dispatch, dispatchBy: new Date(60_000), now: () => new Date(0), sleep: never });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("dispatches at the deadline even while a run is still going, and again when the batch ends", async () => {
    const order: string[] = [];
    let finish = () => {};
    const batch = () => new Promise<void>((resolve) => (finish = () => (order.push("batch done"), resolve())));
    const dispatch = vi.fn(async () => {
      order.push("dispatch");
      if (order.length === 1) finish();
    });
    await runBatchAndDispatch({ batch, dispatch, dispatchBy: new Date(60_000), now: () => new Date(0), sleep: async () => {} });
    expect(order).toEqual(["dispatch", "batch done", "dispatch"]);
  });

  it("still dispatches when the batch throws", async () => {
    const dispatch = vi.fn(async () => null);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await runBatchAndDispatch({ batch: async () => Promise.reject(new Error("boom")), dispatch, dispatchBy: new Date(1), now: () => new Date(0), sleep: never });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});

describe("currentItemStatus", () => {
  it("reads batches stored with the old status names", () => {
    expect(["completed", "attention_needed", "failed"].map(currentItemStatus)).toEqual(["clean", "issues", "error"]);
  });

  it("keeps today's statuses as they are", () => {
    const today = ["pending", "running", "clean", "issues", "error", "skipped"];
    expect(today.map(currentItemStatus)).toEqual(today);
  });
});
