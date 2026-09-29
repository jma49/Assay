import { describe, expect, it, vi } from "vitest";
import { cappedCount, COUNT_CAP, pagination } from "./paging";

describe("cappedCount", () => {
  const collection = (count: number) => ({
    estimatedDocumentCount: vi.fn(async () => count),
    countDocuments: vi.fn(async (_filter: Record<string, unknown>, { limit }: { limit: number }) => Math.min(count, limit)),
  });

  it("uses the metadata count without a filter and a limited count with one", async () => {
    const all = collection(50);
    expect(await cappedCount(all, {})).toEqual({ total: 50, capped: false });
    expect(all.countDocuments).not.toHaveBeenCalled();
    const some = collection(50);
    expect(await cappedCount(some, { outcome: "error" })).toEqual({ total: 50, capped: false });
    expect(some.estimatedDocumentCount).not.toHaveBeenCalled();
  });

  it("stops at COUNT_CAP", async () => {
    expect(await cappedCount(collection(COUNT_CAP + 5), { outcome: "error" })).toEqual({ total: COUNT_CAP, capped: true });
    expect(await cappedCount(collection(COUNT_CAP), {})).toEqual({ total: COUNT_CAP, capped: false });
  });
});

describe("pagination", () => {
  it("describes the page", () => {
    expect(pagination(2, 25, { total: 120, capped: false })).toEqual({ page: 2, limit: 25, total: 120, totalCapped: false, totalPages: 5, hasNext: true, hasPrev: true });
  });
});

