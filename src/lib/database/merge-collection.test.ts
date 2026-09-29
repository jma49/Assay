import { describe, expect, it, vi } from "vitest";
import type { Db } from "mongodb";
import { mergeCollection } from "./migrate-collection-names";

/** Old ids 0..n-1; the new collection already has the even ones. */
function fakeDb(n: number) {
  const oldIds = Array.from({ length: n }, (_, i) => i);
  const newIds = new Set(oldIds.filter((i) => i % 2 === 0));
  const targetFind = vi.fn((filter: { _id: { $in: number[] } }) => ({
    toArray: async () => filter._id.$in.filter((id) => newIds.has(id)).map((_id) => ({ _id })),
  }));
  const db = {
    collection: (name: string) =>
      name === "old"
        ? {
            find: () => ({
              async *[Symbol.asyncIterator]() {
                for (const _id of oldIds) yield { _id };
              },
            }),
          }
        : { find: targetFind },
  } as unknown as Db;
  return { db, targetFind };
}

describe("mergeCollection", () => {
  it("finds the old-only documents with one lookup per 500 ids, not one per document", async () => {
    const { db, targetFind } = fakeDb(1_200);
    const result = await mergeCollection(db, "old", "new", { apply: false, dropOld: false });
    expect(result).toEqual({ missing: 600, copied: 0, complete: false, droppedOld: false });
    expect(targetFind).toHaveBeenCalledTimes(3);
  });
});
