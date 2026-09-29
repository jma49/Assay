import { ObjectId, type Db, type Document } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import type { RunDocument } from "@/server/services/run-check";
import { mongoRunCheckStore } from "./run-check-store";

function fakeDb() {
  const inserted: Document[] = [];
  const collection = { insertOne: async (doc: Document) => void inserted.push(doc) };
  return { db: { collection: () => collection } as unknown as Db, inserted };
}

const run: RunDocument = {
  runId: new ObjectId().toHexString(),
  checkId: "orders",
  trigger: { kind: "manual" },
  startedAt: new Date("2026-09-27T10:00:00Z"),
  finishedAt: new Date("2026-09-27T10:00:01Z"),
  durationMs: 1000,
  outcome: "issues",
  rowCount: 2,
  columns: ["id"],
  sample: [{ id: 1 }, { id: 2 }],
  rowKeys: ["a", "b"],
  diff: null,
  error: null,
  message: "Found 2 records",
  findings: "2 rows",
};

describe("historicalState", () => {
  it("ignores runs from before the check was created (an earlier check with the same id)", async () => {
    const find = vi.fn(() => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }) }));
    const db = { collection: () => ({ find }) } as unknown as Db;
    const createdAt = new Date("2026-09-20T00:00:00Z");
    await mongoRunCheckStore(db).historicalState("orders", createdAt);
    expect((find.mock.calls[0] as unknown[])[0]).toEqual({ checkId: "orders", finishedAt: { $gte: createdAt } });
    await mongoRunCheckStore(db).historicalState("orders", null);
    expect((find.mock.calls[1] as unknown[])[0]).toEqual({ checkId: "orders" });
  });
});

describe("saveRun", () => {
  it("writes the run's own fields and the sample, but not the retired legacy ones", async () => {
    const { db, inserted } = fakeDb();
    await mongoRunCheckStore(db).saveRun(run);
    const [doc] = inserted;
    expect(doc).toMatchObject({ checkId: "orders", outcome: "issues", rowCount: 2, sample: run.sample, message: "Found 2 records" });
    expect(doc.expiresAt).toBeInstanceOf(Date);
    for (const field of ["script_name", "execution_time", "status", "statusType", "raw_results"]) expect(doc).not.toHaveProperty(field);
  });
});
