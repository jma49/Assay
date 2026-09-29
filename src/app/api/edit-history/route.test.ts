import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  isGuest: false,
  rows: [] as Record<string, unknown>[],
  total: 0,
  find: vi.fn(),
  sort: vi.fn(),
  skip: vi.fn(),
  limit: vi.fn(),
  countDocuments: vi.fn(),
  estimatedDocumentCount: vi.fn(),
  aggregate: vi.fn(),
}));

vi.mock("@/lib/auth/auth-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth-utils")>()),
  validateApiAuth: async () => ({ isValid: true, user: { id: "user_viewer", fullName: null }, userEmail: "v@example.com", isGuest: mocks.isGuest }),
}));
vi.mock("@/lib/auth/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rbac")>()),
  requirePermission: async () => ({ authorized: true }),
}));
vi.mock("@/lib/database/mongodb", () => {
  const cursor = {
    sort: (...args: unknown[]) => (mocks.sort(...args), cursor),
    skip: (...args: unknown[]) => (mocks.skip(...args), cursor),
    limit: (...args: unknown[]) => (mocks.limit(...args), cursor),
    toArray: async () => mocks.rows,
  };
  return {
    getMongoDbClient: () => ({
      getDb: async () => ({
        collection: () => ({
          find: (...args: unknown[]) => (mocks.find(...args), cursor),
          aggregate: mocks.aggregate,
          countDocuments: async (...args: unknown[]) => (mocks.countDocuments(...args), mocks.total),
          estimatedDocumentCount: async () => (mocks.estimatedDocumentCount(), mocks.total),
        }),
      }),
    }),
  };
});

import { GET } from "./route";

const list = (query = "") => GET(new NextRequest(`http://localhost/api/edit-history${query}`), { params: Promise.resolve({}) });

describe("GET /api/edit-history", () => {
  beforeEach(() => {
    mocks.isGuest = false;
    mocks.rows = [{ _id: "h1", userEmail: "ann@example.com", userId: "u1", searchableAuthor: "ann" }];
    mocks.total = 41;
    for (const fn of [mocks.find, mocks.sort, mocks.skip, mocks.limit, mocks.countDocuments, mocks.estimatedDocumentCount, mocks.aggregate]) fn.mockClear();
  });

  it("answers 400 for an unknown sort field instead of a 500 from an empty $sort", async () => {
    const res = await list("?sortBy=nope");
    expect(res.status).toBe(400);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("reads one page through a sorted, limited find and counts without scanning when unfiltered", async () => {
    const res = await list("?page=3&limit=20");
    expect(res.status).toBe(200);
    expect(mocks.aggregate).not.toHaveBeenCalled();
    expect(mocks.find).toHaveBeenCalledWith({});
    expect(mocks.sort).toHaveBeenCalledWith({ operationTime: -1 });
    expect(mocks.skip).toHaveBeenCalledWith(40);
    expect(mocks.limit).toHaveBeenCalledWith(20);
    expect(mocks.estimatedDocumentCount).toHaveBeenCalled();
    expect((await res.json()).pagination).toEqual({ page: 3, limit: 20, total: 41, totalCapped: false, totalPages: 3, hasNext: false, hasPrev: true });
  });

  it("counts a filtered list up to the cap", async () => {
    await list("?operation=delete");
    expect(mocks.countDocuments).toHaveBeenCalledWith({ operationType: "delete" }, { limit: 10_001 });
  });

  it("hides who made a change from demo guests", async () => {
    mocks.isGuest = true;
    const { histories } = await (await list()).json();
    expect(histories).toEqual([{ _id: "h1", searchableAuthor: "ann" }]);
  });
});
