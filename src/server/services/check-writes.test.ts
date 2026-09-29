import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db, Document } from "mongodb";

const calls: string[] = [];
vi.mock("@/lib/workflows/version-control", () => ({
  createScriptVersion: async (_db: unknown, _id: string, _d: unknown, _by: string, _e: string, change: string) => void calls.push(`version:${change}`),
}));
vi.mock("@/lib/workflows/edit-history-store", () => ({
  recordEditHistoryOnServer: async (params: { operation: string }) => (calls.push(`history:${params.operation}`), true),
}));

import { createCheck, deleteCheck, updateCheck } from "./check-writes";

function fakeDb(existing: Document | null, { matched = 1, stillThere = 1 } = {}) {
  let doc = existing;
  const collection = {
    insertOne: async (d: Document) => (calls.push("insert"), { insertedId: "id1", d }),
    findOne: async () => doc,
    findOneAndUpdate: vi.fn(async (_filter: Document, update: { $set: Document }, options: { returnDocument: string }) => {
      if (matched === 0 || !doc) return null;
      const before = doc;
      doc = { ...doc, ...update.$set, version: (doc?.version ?? 0) + 1 };
      calls.push("update");
      return options.returnDocument === "before" ? before : doc;
    }),
    countDocuments: async () => (doc ? stillThere : 0),
    deleteOne: async () => (calls.push("delete"), { deletedCount: doc ? 1 : 0 }),
  };
  return { db: { collection: () => collection } as unknown as Db, collection };
}

const actor = { id: "u1", email: "ann@example.com" };

beforeEach(() => {
  calls.length = 0;
});

describe("check writes", () => {
  it("creates, versions, records history and clears the cache in that order", async () => {
    const { db } = fakeDb(null);
    expect(await createCheck(db, { scriptId: "orders", name: "Orders", sqlContent: "SELECT 1" }, actor, "note", "major")).toBe("id1");
    expect(calls).toEqual(["insert", "version:create", "history:create"]);
  });

  it("updates only onto the expected version and stamps who changed it", async () => {
    const { db, collection } = fakeDb({ scriptId: "orders", version: 3 });
    const result = await updateCheck(db, "orders", { name: "New" }, 3, actor, "note");
    expect(result.kind).toBe("updated");
    const [filter, update] = collection.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ scriptId: "orders", version: 3 });
    expect(update.$set.updatedBy).toEqual(actor);
    expect(calls).toEqual(["update", "history:update", "version:update"]);
  });

  it("reports a conflict or a missing check without side effects", async () => {
    expect((await updateCheck(fakeDb({ scriptId: "orders", version: 4 }, { matched: 0 }).db, "orders", {}, 3, actor, "n")).kind).toBe("conflict");
    expect((await updateCheck(fakeDb({ scriptId: "orders" }, { matched: 0, stillThere: 0 }).db, "orders", {}, 3, actor, "n")).kind).toBe("missing");
    expect((await updateCheck(fakeDb(null).db, "orders", {}, 3, actor, "n")).kind).toBe("missing");
    expect(calls).toEqual([]);
  });

  it("deletes with history, and says when the check was already gone", async () => {
    expect(await deleteCheck(fakeDb({ scriptId: "orders" }).db, "orders", actor)).toBe(true);
    expect(calls).toEqual(["delete", "history:delete"]);
    expect(await deleteCheck(fakeDb(null).db, "orders", actor)).toBe(false);
  });
});
