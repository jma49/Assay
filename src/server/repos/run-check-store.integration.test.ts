import { randomUUID } from "node:crypto";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureIndexes } from "@/lib/database/indexes";
import { COLLECTIONS } from "@/lib/database/collections";
import { createSemaphore } from "@/server/concurrency/semaphore";
import { runCheck, type CheckEvent } from "@/server/services/run-check";
import { mongoRunCheckStore, repairPendingEvents } from "./run-check-store";

/**
 * Against a real MongoDB, only when MONGODB_TEST_URI points at a throwaway
 * server (e.g. mongodb-memory-server); never the one in .env.local. Each run
 * uses its own `assay_it_*` database and drops it.
 */
const uri = process.env.MONGODB_TEST_URI;

describe.skipIf(!uri)("run-check store (MongoDB)", () => {
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    client = await MongoClient.connect(uri!);
    db = client.db(`assay_it_${randomUUID().slice(0, 8)}`);
    await ensureIndexes(db, [COLLECTIONS.checks, COLLECTIONS.events]);
  });

  afterAll(async () => {
    if (db?.databaseName.startsWith("assay_it_")) await db.dropDatabase();
    await client?.close();
  });

  const event = (checkId: string, runId: string): CheckEvent => ({
    type: "check.outcome_changed",
    checkId,
    runId,
    from: null,
    to: "issues",
    rowCount: 1,
    diff: null,
    error: null,
    at: new Date(),
  });

  it("commits the state and its event together, so a crash before the event is written loses nothing", async () => {
    const store = mongoRunCheckStore(db);
    await db.collection(COLLECTIONS.checks).insertOne({ scriptId: "crash", sqlContent: "SELECT 1" });
    const runId = new ObjectId().toHexString();
    expect((await store.acquireLease("crash", runId, new Date(Date.now() + 60_000), new Date())).kind).toBe("acquired");
    const state = { outcome: "issues" as const, rowCount: 1, previousRowCount: 0, since: new Date(), lastRunId: runId, lastRunAt: new Date() };

    // The process "dies" right after the commit: recordEvent is never called.
    expect(await store.commitState("crash", runId, state, event("crash", runId))).toBe(true);
    const check = await db.collection(COLLECTIONS.checks).findOne({ scriptId: "crash" });
    expect(check?.state.outcome).toBe("issues");
    expect(check?.pendingEvents).toHaveLength(1);
    expect(await db.collection(COLLECTIONS.events).countDocuments({ runId })).toBe(0);

    // Two dispatchers repair at once: one event, and the marker is gone.
    await Promise.all([repairPendingEvents(db), repairPendingEvents(db)]);
    expect(await db.collection(COLLECTIONS.events).countDocuments({ runId })).toBe(1);
    expect((await db.collection(COLLECTIONS.checks).findOne({ scriptId: "crash" }))?.pendingEvents).toEqual([]);
  });

  it("writes the event of a normal run and leaves nothing pending", async () => {
    await db.collection(COLLECTIONS.checks).insertOne({ scriptId: "normal", sqlContent: "SELECT 1" });
    const result = await runCheck(
      "normal",
      { kind: "manual" },
      {
        store: mongoRunCheckStore(db),
        sources: async () => ({ runReadOnly: async () => [{ rows: [{ id: 1 }], rowCount: 1 }] }),
        executions: createSemaphore(1),
        newRunId: () => new ObjectId().toHexString(),
        now: () => new Date(),
        timeoutMs: 1_000,
      },
    );
    expect(result).toMatchObject({ kind: "completed", outcome: "issues", stateUpdated: true });
    const runId = (result as { runId: string }).runId;
    expect(await db.collection(COLLECTIONS.events).countDocuments({ runId })).toBe(1);
    expect((await db.collection(COLLECTIONS.checks).findOne({ scriptId: "normal" }))?.pendingEvents).toEqual([]);
  });
});
