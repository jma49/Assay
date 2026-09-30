import { describe, expect, it, vi } from "vitest";
import type { CheckState } from "@/domain/run";
import { createSemaphore } from "@/server/concurrency/semaphore";
import type { DataSource, StatementResult } from "@/server/datasource/types";
import {
  runCheck,
  type CheckEvent,
  type CheckToRun,
  type LeaseResult,
  type RunCheckDeps,
  type RunCheckStore,
  type RunDocument,
} from "./run-check";

/** An in-memory store with the same lease and fencing rules as the MongoDB one. */
function memoryStore(checks: CheckToRun[]) {
  const docs = new Map(
    checks.map((c) => [c.scriptId, { ...c, lease: null as { runId: string; until: Date } | null, pendingEvents: [] as CheckEvent[] }]),
  );
  const runs: RunDocument[] = [];
  const events: CheckEvent[] = [];
  const store: RunCheckStore = {
    async acquireLease(scriptId, runId, until, now): Promise<LeaseResult> {
      const doc = docs.get(scriptId);
      if (!doc) return { kind: "missing" };
      if (doc.lease && doc.lease.until > now) return { kind: "busy", runId: doc.lease.runId };
      doc.lease = { runId, until };
      return { kind: "acquired", check: { scriptId, sqlContent: doc.sqlContent, dataSourceId: doc.dataSourceId, state: doc.state, createdAt: doc.createdAt, pendingEvents: [...doc.pendingEvents] } };
    },
    async historicalState() {
      return null;
    },
    async previousRowKeys(runId) {
      return runs.find((r) => r.runId === runId)?.rowKeys ?? null;
    },
    async saveRun(run) {
      runs.push(run);
    },
    async commitState(scriptId, runId, state, event) {
      const doc = docs.get(scriptId)!;
      if (doc.lease?.runId !== runId) return false;
      doc.state = state;
      doc.lease = null;
      if (event) doc.pendingEvents.push(event);
      return true;
    },
    async releaseLease(scriptId, runId) {
      const doc = docs.get(scriptId)!;
      if (doc.lease?.runId === runId) doc.lease = null;
    },
    async renewLease(scriptId, runId, until) {
      const doc = docs.get(scriptId)!;
      if (doc.lease?.runId !== runId) return false;
      doc.lease.until = until;
      return true;
    },
    async recordEvent(event) {
      if (!events.some((e) => e.runId === event.runId)) events.push(event);
      const doc = docs.get(event.checkId);
      if (doc) doc.pendingEvents = doc.pendingEvents.filter((e) => e.runId !== event.runId);
    },
  };
  return { store, docs, runs, events };
}

function rowsSource(rowsByCall: Record<string, unknown>[][]): DataSource & { calls: number } {
  const source = {
    calls: 0,
    async runReadOnly(): Promise<StatementResult[]> {
      const rows = rowsByCall[Math.min(source.calls++, rowsByCall.length - 1)];
      return [{ rows, rowCount: rows.length }];
    },
  };
  return source;
}

function deps(store: RunCheckStore, source: DataSource, clock = { t: Date.UTC(2026, 8, 26, 12) }): RunCheckDeps {
  let id = 0;
  return {
    store,
    sources: async () => source,
    executions: createSemaphore(4),
    newRunId: () => `run${++id}`,
    now: () => new Date((clock.t += 1000)),
    timeoutMs: 30_000,
  };
}

const CHECK = { scriptId: "orders-without-payment", sqlContent: "SELECT id FROM demo.orders WHERE paid AND NOT has_payment;" };

describe("runCheck", () => {
  it("records the run, updates the check state and reports new, still-open and fixed rows", async () => {
    const { store, docs, runs, events } = memoryStore([CHECK]);
    const d = deps(store, rowsSource([[{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }, { id: 4 }]]));

    const first = await runCheck(CHECK.scriptId, { kind: "schedule" }, d);
    expect(first).toMatchObject({ kind: "completed", outcome: "issues", rowCount: 2, diff: null, findings: "Found 2 records" });
    expect(events.map((e) => e.type)).toEqual(["check.outcome_changed"]);

    const second = await runCheck(CHECK.scriptId, { kind: "manual", by: { id: "u1", name: "Ann" } }, d);
    expect(second).toMatchObject({ kind: "completed", rowCount: 3, diff: { added: 2, still: 1, fixed: 1 } });
    expect(events.map((e) => e.type)).toEqual(["check.outcome_changed", "check.new_rows"]);

    const state = docs.get(CHECK.scriptId)!.state as CheckState;
    expect(state).toMatchObject({ outcome: "issues", rowCount: 3, previousRowCount: 2, lastRunId: "run2" });
    expect(state.since).toEqual(runs[0].finishedAt);
    expect(docs.get(CHECK.scriptId)!.lease).toBeNull();
  });

  it("does not start a second run while one holds the lease", async () => {
    const { store, docs } = memoryStore([CHECK]);
    docs.get(CHECK.scriptId)!.lease = { runId: "live", until: new Date(Date.UTC(2030, 0, 1)) };
    const source = rowsSource([[]]);
    expect(await runCheck(CHECK.scriptId, { kind: "manual" }, deps(store, source))).toEqual({ kind: "busy", runId: "live" });
    expect(source.calls).toBe(0);
  });

  it("takes over an expired lease", async () => {
    const { store, docs } = memoryStore([CHECK]);
    docs.get(CHECK.scriptId)!.lease = { runId: "crashed", until: new Date(Date.UTC(2020, 0, 1)) };
    expect(await runCheck(CHECK.scriptId, { kind: "schedule" }, deps(store, rowsSource([[]])))).toMatchObject({
      kind: "completed",
      outcome: "clean",
    });
  });

  it("keeps a run whose lease was taken over, but never lets it overwrite the newer state", async () => {
    const { store, docs, runs, events } = memoryStore([CHECK]);
    const slow: DataSource = {
      async runReadOnly() {
        // While this run is still executing, its lease expires and a newer run takes the check.
        docs.get(CHECK.scriptId)!.lease = { runId: "newer", until: new Date(Date.UTC(2030, 0, 1)) };
        return [{ rows: [{ id: 9 }], rowCount: 1 }];
      },
    };
    const result = await runCheck(CHECK.scriptId, { kind: "schedule" }, deps(store, slow));
    expect(result).toMatchObject({ kind: "completed", stateUpdated: false });
    expect(runs).toHaveLength(1);
    expect(docs.get(CHECK.scriptId)!.state).toBeUndefined();
    expect(docs.get(CHECK.scriptId)!.lease?.runId).toBe("newer");
    expect(events).toHaveLength(0);
  });

  it("records a failing query as an error without throwing, and frees the lease", async () => {
    const { store, docs, runs } = memoryStore([CHECK]);
    const broken: DataSource = {
      async runReadOnly() {
        throw new Error('column "shipping_status" does not exist');
      },
    };
    const result = await runCheck(CHECK.scriptId, { kind: "manual" }, deps(store, broken));
    expect(result).toMatchObject({ kind: "completed", outcome: "error", message: 'column "shipping_status" does not exist' });
    expect(runs[0]).toMatchObject({ outcome: "error", findings: "Execution incomplete", rowKeys: [] });
    expect(docs.get(CHECK.scriptId)!.lease).toBeNull();
  });

  it("refuses to run a check that is not read-only", async () => {
    const { store } = memoryStore([{ scriptId: "bad", sqlContent: "DELETE FROM demo.orders" }]);
    const source = rowsSource([[]]);
    const result = await runCheck("bad", { kind: "manual" }, deps(store, source));
    expect(result).toMatchObject({ kind: "completed", outcome: "error" });
    expect(source.calls).toBe(0);
  });

  it("frees the lease when saving the run fails", async () => {
    const { store, docs } = memoryStore([CHECK]);
    store.saveRun = vi.fn(async () => Promise.reject(new Error("mongo down")));
    await expect(runCheck(CHECK.scriptId, { kind: "manual" }, deps(store, rowsSource([[]])))).rejects.toThrow("mongo down");
    expect(docs.get(CHECK.scriptId)!.lease).toBeNull();
  });

  it("caps the stored sample and the fingerprints", async () => {
    const { store, runs } = memoryStore([CHECK]);
    const many = Array.from({ length: 6_000 }, (_, id) => ({ id }));
    const result = await runCheck(CHECK.scriptId, { kind: "manual" }, deps(store, rowsSource([many])));
    expect(result).toMatchObject({ rowCount: 6_000 });
    expect(runs[0].sample).toHaveLength(500);
    expect(runs[0].rowKeys).toHaveLength(5_000);
  });

  it("continues a check's history when it has no stored state yet", async () => {
    const { store, docs } = memoryStore([CHECK]);
    const since = new Date(Date.UTC(2026, 8, 24));
    store.historicalState = vi.fn(async () => ({ outcome: "issues" as const, rowCount: 2, previousRowCount: 2, since, lastRunId: "old", lastRunAt: since }));
    docs.get(CHECK.scriptId)!.createdAt = new Date(Date.UTC(2026, 8, 20));
    await runCheck(CHECK.scriptId, { kind: "manual" }, deps(store, rowsSource([[{ id: 1 }, { id: 2 }]])));
    expect(docs.get(CHECK.scriptId)!.state).toMatchObject({ outcome: "issues", since, previousRowCount: 2 });
    // Only runs of this check, not of an earlier one deleted under the same id.
    expect(store.historicalState).toHaveBeenCalledWith(CHECK.scriptId, new Date(Date.UTC(2026, 8, 20)));
  });

  it("reports an unknown check", async () => {
    const { store } = memoryStore([]);
    expect(await runCheck("nope", { kind: "manual" }, deps(store, rowsSource([[]])))).toEqual({ kind: "missing" });
  });
});

describe("alerts survive a failure after the state is saved", () => {
  it("keeps the event on the check with the new state when writing it fails, and the next run writes it first", async () => {
    const { store, docs, events } = memoryStore([CHECK]);
    const recordEvent = store.recordEvent;
    store.recordEvent = vi.fn(async () => Promise.reject(new Error("mongo blip")));
    const d = deps(store, rowsSource([[{ id: 1 }], [{ id: 1 }]]));

    const first = await runCheck(CHECK.scriptId, { kind: "schedule" }, d);
    expect(first).toMatchObject({ kind: "completed", outcome: "issues", stateUpdated: true });
    expect(events).toHaveLength(0);
    const doc = docs.get(CHECK.scriptId)!;
    expect(doc.state).toMatchObject({ outcome: "issues" });
    expect(doc.pendingEvents).toMatchObject([{ runId: "run1", type: "check.outcome_changed", to: "issues" }]);

    // The next run sees the same outcome, so it has no event of its own, but it writes the stranded one.
    store.recordEvent = recordEvent;
    await runCheck(CHECK.scriptId, { kind: "schedule" }, d);
    expect(events.map((e) => e.runId)).toEqual(["run1"]);
    expect(doc.pendingEvents).toEqual([]);
  });

  it("clears the pending event once it is written", async () => {
    const { store, docs, events } = memoryStore([CHECK]);
    await runCheck(CHECK.scriptId, { kind: "schedule" }, deps(store, rowsSource([[{ id: 1 }]])));
    expect(events).toHaveLength(1);
    expect(docs.get(CHECK.scriptId)!.pendingEvents).toEqual([]);
  });
});

describe("large results", () => {
  it("counts every row but keeps only what fingerprints need", async () => {
    const { store, runs } = memoryStore([CHECK]);
    const big: DataSource = {
      async runReadOnly(_statements, { maxRows }) {
        expect(maxRows).toBe(5_000);
        return [{ rows: Array.from({ length: maxRows }, (_, id) => ({ id })), rowCount: 2_000_000 }];
      },
    };
    const result = await runCheck(CHECK.scriptId, { kind: "schedule" }, deps(store, big));
    expect(result).toMatchObject({ kind: "completed", outcome: "issues", rowCount: 2_000_000 });
    expect(runs[0]).toMatchObject({ rowCount: 2_000_000, message: expect.stringContaining("Found 2000000 records") });
    expect(runs[0].rowKeys).toHaveLength(5_000);
  });
});

describe("data sources", () => {
  it("runs each check against its own source, and the built-in one when it names none", async () => {
    const billing = { ...CHECK, scriptId: "unpaid-invoices", dataSourceId: "billing" };
    const { store } = memoryStore([CHECK, billing]);
    const asked: string[] = [];
    const d = deps(store, rowsSource([[]]));
    d.sources = async (sourceId) => {
      asked.push(sourceId);
      return rowsSource([sourceId === "billing" ? [{ invoice: 7 }] : []]);
    };
    expect(await runCheck(billing.scriptId, { kind: "manual" }, d)).toMatchObject({ outcome: "issues", rowCount: 1 });
    expect(await runCheck(CHECK.scriptId, { kind: "manual" }, d)).toMatchObject({ outcome: "clean" });
    expect(asked).toEqual(["billing", "default"]);
  });

  it("records a broken run when the check's source no longer exists", async () => {
    const { store, runs } = memoryStore([{ ...CHECK, dataSourceId: "gone" }]);
    const d = deps(store, rowsSource([[]]));
    d.sources = async (sourceId) => {
      throw new Error(`No data source with the id '${sourceId}'`);
    };
    const result = await runCheck(CHECK.scriptId, { kind: "manual" }, d);
    expect(result).toMatchObject({ kind: "completed", outcome: "error", message: "No data source with the id 'gone'" });
    expect(runs).toHaveLength(1);
  });
});

describe("waiting for a free slot", () => {
  it("gives up without querying when another run took the check while it waited", async () => {
    const { store, docs, runs } = memoryStore([CHECK]);
    const source = rowsSource([[{ id: 1 }]]);
    const d = deps(store, source);
    d.executions = {
      run: async <T>(fn: () => Promise<T>) => {
        docs.get(CHECK.scriptId)!.lease = { runId: "newer", until: new Date(Date.UTC(2030, 0, 1)) };
        return fn();
      },
    } as RunCheckDeps["executions"];
    expect(await runCheck(CHECK.scriptId, { kind: "schedule" }, d)).toEqual({ kind: "busy", runId: "" });
    expect(source.calls).toBe(0);
    expect(runs).toHaveLength(0);
    expect(docs.get(CHECK.scriptId)!.lease?.runId).toBe("newer");
  });

  it("restarts the lease clock once a slot is free", async () => {
    const { store, docs } = memoryStore([CHECK]);
    let leaseWhenQuerying: Date | undefined;
    const source: DataSource = {
      async runReadOnly() {
        leaseWhenQuerying = docs.get(CHECK.scriptId)!.lease?.until;
        return [{ rows: [], rowCount: 0 }];
      },
    };
    const d = deps(store, source);
    const clock = { t: d.now().getTime() };
    d.now = () => new Date(clock.t);
    d.executions = { run: async <T>(fn: () => Promise<T>) => ((clock.t += 45_000), fn()) } as RunCheckDeps["executions"];
    await runCheck(CHECK.scriptId, { kind: "schedule" }, d);
    expect(leaseWhenQuerying!.getTime()).toBe(clock.t + d.timeoutMs + 60_000);
  });
});
