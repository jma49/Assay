import { describe, expect, it } from "vitest";
import type { Db } from "mongodb";
import {
  HEARTBEAT_STALE_MS,
  heartbeatStatus,
  readHeartbeat,
  recordHeartbeat,
  SCHEDULER_NAME,
  type HeartbeatDoc,
} from "./heartbeat-store";

function fakeDb() {
  const docs = new Map<string, HeartbeatDoc>();
  const collection = {
    updateOne: async (filter: { _id: string }, update: { $set: Partial<HeartbeatDoc> }) => {
      const current = docs.get(filter._id) ?? { _id: filter._id, updatedAt: new Date(0) };
      docs.set(filter._id, { ...current, ...update.$set });
    },
    findOne: async (filter: { _id: string }) => docs.get(filter._id) ?? null,
  };
  return { db: { collection: () => collection } as unknown as Db, docs };
}

describe("heartbeat store", () => {
  it("records and reads back a heartbeat", async () => {
    const { db } = fakeDb();
    await recordHeartbeat(db, SCHEDULER_NAME, { runId: "run-1", mode: "scheduled" });
    const doc = await readHeartbeat(db, SCHEDULER_NAME);
    expect(doc).toMatchObject({ _id: SCHEDULER_NAME, runId: "run-1", mode: "scheduled" });
    expect(doc?.updatedAt).toBeInstanceOf(Date);
  });

  it("upserts: a second heartbeat replaces the first", async () => {
    const { db, docs } = fakeDb();
    await recordHeartbeat(db, SCHEDULER_NAME, { runId: "run-1" });
    await recordHeartbeat(db, SCHEDULER_NAME, { runId: "run-2" });
    expect(docs.size).toBe(1);
    expect((await readHeartbeat(db, SCHEDULER_NAME))?.runId).toBe("run-2");
  });

  it("reads null when the scheduler never ran", async () => {
    const { db } = fakeDb();
    expect(await readHeartbeat(db, "other")).toBeNull();
  });
});

describe("heartbeatStatus", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  it("is never without a heartbeat", () => {
    expect(heartbeatStatus(null, now)).toBe("never");
  });
  it("is ok for a fresh heartbeat", () => {
    expect(heartbeatStatus({ updatedAt: new Date(now.getTime() - 30 * 60 * 1000) }, now)).toBe("ok");
  });
  it("is ok exactly at the threshold", () => {
    expect(heartbeatStatus({ updatedAt: new Date(now.getTime() - HEARTBEAT_STALE_MS) }, now)).toBe("ok");
  });
  it("is stale past the threshold", () => {
    expect(heartbeatStatus({ updatedAt: new Date(now.getTime() - HEARTBEAT_STALE_MS - 1) }, now)).toBe("stale");
  });
  it("is ok for a recent scheduled heartbeat", () => {
    expect(heartbeatStatus({ updatedAt: new Date(now.getTime() - 30 * 60 * 1000), mode: "scheduled" }, now)).toBe("ok");
  });
  it("is stale for an old scheduled heartbeat", () => {
    expect(
      heartbeatStatus({ updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), mode: "scheduled" }, now),
    ).toBe("stale");
  });
  it("is stale for a recent manual heartbeat: it must not mask a dead schedule", () => {
    expect(heartbeatStatus({ updatedAt: new Date(now.getTime() - 5 * 60 * 1000), mode: "all" }, now)).toBe("stale");
  });
});
