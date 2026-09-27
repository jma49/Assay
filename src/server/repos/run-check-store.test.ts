import { ObjectId, type Db, type Document } from "mongodb";
import { describe, expect, it } from "vitest";
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

describe("saveRun", () => {
  it("writes the run's own fields and the sample, but not the retired legacy ones", async () => {
    const { db, inserted } = fakeDb();
    await mongoRunCheckStore(db).saveRun(run);
    const [doc] = inserted;
    expect(doc).toMatchObject({ checkId: "orders", outcome: "issues", rowCount: 2, raw_results: run.sample, message: "Found 2 records" });
    expect(doc.expiresAt).toBeInstanceOf(Date);
    for (const field of ["script_name", "execution_time", "status", "statusType"]) expect(doc).not.toHaveProperty(field);
  });
});
