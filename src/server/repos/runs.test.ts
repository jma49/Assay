import { describe, expect, it, vi } from "vitest";
import { ObjectId, type Db } from "mongodb";
import { countRunsByOutcome, findRun, latestRunsOf, saveTriage } from "./runs";

function fakeDb(collection: Record<string, unknown>) {
  const names: string[] = [];
  const db = {
    collection: (name: string) => {
      names.push(name);
      return collection;
    },
  } as unknown as Db;
  return { db, names };
}

describe("findRun", () => {
  it("reads one run by id with the caller's projection", async () => {
    const findOne = vi.fn(async () => ({ _id: "r" }));
    const { db, names } = fakeDb({ findOne });
    const id = new ObjectId().toHexString();
    expect(await findRun(db, id, { outcome: 1 })).toEqual({ _id: "r" });
    expect(names).toEqual(["runs"]);
    expect(findOne).toHaveBeenCalledWith({ _id: new ObjectId(id) }, { projection: { outcome: 1 } });
  });

  it("answers null for an id that is not an ObjectId, without a query", async () => {
    const findOne = vi.fn();
    expect(await findRun(fakeDb({ findOne }).db, "nope", {})).toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });
});

describe("latestRunsOf", () => {
  it("reads a check's newest runs through the (checkId, finishedAt) index", async () => {
    const calls: unknown[] = [];
    const cursor = {
      sort: (sort: unknown) => (calls.push(["sort", sort]), cursor),
      limit: (limit: unknown) => (calls.push(["limit", limit]), cursor),
      toArray: async () => [{ _id: 1 }],
    };
    const find = vi.fn(() => cursor);
    expect(await latestRunsOf(fakeDb({ find }).db, "orders", 2, { outcome: 1 })).toEqual([{ _id: 1 }]);
    expect(find).toHaveBeenCalledWith({ checkId: "orders" }, { projection: { outcome: 1 } });
    expect(calls).toEqual([["sort", { finishedAt: -1 }], ["limit", 2]]);
  });
});

describe("countRunsByOutcome", () => {
  it("counts each outcome with an indexed filter and totals them", async () => {
    const counts: Record<string, number> = { clean: 6, issues: 1, error: 3 };
    const filters: unknown[] = [];
    const countDocuments = async (filter: { outcome: string }) => {
      filters.push(filter);
      return counts[filter.outcome];
    };
    expect(await countRunsByOutcome(fakeDb({ countDocuments }).db)).toEqual({
      totalCount: 10,
      successCount: 6,
      failureCount: 3,
      needsAttentionCount: 1,
    });
    expect(filters).toEqual([{ outcome: "clean" }, { outcome: "issues" }, { outcome: "error" }]);
  });
});

describe("saveTriage", () => {
  it("keeps the triage per language on the run", async () => {
    const updateOne = vi.fn(async () => ({}));
    const id = new ObjectId();
    await saveTriage(fakeDb({ updateOne }).db, id, "zh", { kind: "data_issue" });
    expect(updateOne).toHaveBeenCalledWith({ _id: id }, { $set: { "aiTriage.zh": { kind: "data_issue" } } });
  });
});
