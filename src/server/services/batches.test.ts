import { describe, expect, it, vi } from "vitest";
import { currentItemStatus, runBatch, type Batch, type BatchItem, type BatchStore } from "./batches";
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

describe("currentItemStatus", () => {
  it("reads batches stored with the old status names", () => {
    expect(["completed", "attention_needed", "failed"].map(currentItemStatus)).toEqual(["clean", "issues", "error"]);
  });

  it("keeps today's statuses as they are", () => {
    expect(["pending", "running", "clean", "issues", "error"].map(currentItemStatus)).toEqual([
      "pending",
      "running",
      "clean",
      "issues",
      "error",
    ]);
  });
});
