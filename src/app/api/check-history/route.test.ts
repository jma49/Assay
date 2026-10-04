import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  permissions: [] as string[],
  authorized: true,
  taggedChecks: [] as { scriptId: string; hashtags?: string[] }[],
  runs: [] as Record<string, unknown>[],
  total: 0,
  checksFind: vi.fn(),
  runsFind: vi.fn(),
  sort: vi.fn(),
  skip: vi.fn(),
  limit: vi.fn(),
  countDocuments: vi.fn(),
  estimatedDocumentCount: vi.fn(),
  aggregate: vi.fn(),
}));

vi.mock("@/lib/auth/auth-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth-utils")>()),
  validateApiAuth: async () =>
    mocks.denied ? { isValid: false, response: mocks.denied } : { isValid: true, user: { id: "user_viewer", fullName: null }, userEmail: "v@example.com", isGuest: false },
}));
vi.mock("@/lib/auth/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rbac")>()),
  requirePermission: async (_userId: string, permission: string) => {
    mocks.permissions.push(permission);
    return { authorized: mocks.authorized };
  },
}));
vi.mock("@/lib/database/mongodb", () => {
  const cursor = {
    sort: (...args: unknown[]) => (mocks.sort(...args), cursor),
    skip: (...args: unknown[]) => (mocks.skip(...args), cursor),
    limit: (...args: unknown[]) => (mocks.limit(...args), cursor),
    toArray: async () => mocks.runs,
  };
  return {
    getMongoDbClient: () => ({
      getDb: async () => ({
        collection: (name: string) =>
          name === "checks"
            ? { find: (...args: unknown[]) => (mocks.checksFind(...args), { toArray: async () => mocks.taggedChecks }) }
            : {
                find: (...args: unknown[]) => (mocks.runsFind(...args), cursor),
                aggregate: (...args: unknown[]) => (mocks.aggregate(...args), { toArray: async () => mocks.runs }),
                countDocuments: async (...args: unknown[]) => (mocks.countDocuments(...args), mocks.total),
                estimatedDocumentCount: async () => (mocks.estimatedDocumentCount(), mocks.total),
              },
      }),
    }),
  };
});

import { GET } from "./route";

const history = (query = "") => GET(new NextRequest(`http://localhost/api/check-history${query}`), { params: Promise.resolve({}) });

const run = {
  _id: "run_1",
  checkId: "orders-check",
  finishedAt: "2026-09-01T00:00:00.000Z",
  outcome: "issues",
  message: "2 rows",
  findings: "dupes",
  raw_results: [{ id: 1 }],
  github_run_id: 42,
};

describe("GET /api/check-history", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.permissions = [];
    mocks.authorized = true;
    mocks.taggedChecks = [];
    mocks.runs = [run];
    mocks.total = 1;
    for (const fn of [mocks.checksFind, mocks.runsFind, mocks.sort, mocks.skip, mocks.limit, mocks.countDocuments, mocks.estimatedDocumentCount, mocks.aggregate]) fn.mockClear();
  });

  it("returns the auth response when the caller is not signed in", async () => {
    mocks.denied = NextResponse.json({ message: "sign in" }, { status: 401 });
    expect(await history()).toBe(mocks.denied);
    expect(mocks.runsFind).not.toHaveBeenCalled();
  });

  it("needs history:read", async () => {
    mocks.authorized = false;
    expect((await history()).status).toBe(403);
    expect(mocks.permissions).toEqual(["history:read"]);
    expect(mocks.runsFind).not.toHaveBeenCalled();
  });

  it("answers with data, pagination and query_info", async () => {
    const res = await history();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["data", "pagination", "query_info"]);
    expect(body.data).toEqual([
      {
        _id: "run_1",
        checkId: "orders-check",
        finishedAt: "2026-09-01T00:00:00.000Z",
        outcome: "issues",
        rowCount: null,
        error: null,
        message: "2 rows",
        findings: "dupes",
        github_run_id: 42,
      },
    ]);
    expect(body.pagination).toEqual({ page: 1, limit: 50, total: 1, totalCapped: false, totalPages: 1, hasNext: false, hasPrev: false });
    expect(body.query_info).toEqual({ sort_by: "finishedAt", sort_order: "desc" });
  });

  it("passes filter, sort and paging to the runs query", async () => {
    mocks.total = 120;
    const res = await history("?page=2&limit=25&search=orders&outcome=error&sort_by=checkId&sort_order=asc");
    const filter = { checkId: { $regex: "orders", $options: "i" }, outcome: "error" };
    expect(mocks.runsFind).toHaveBeenCalledWith(filter, expect.anything());
    expect(mocks.countDocuments).toHaveBeenCalledWith(filter, { limit: 10_001 });
    expect(mocks.sort).toHaveBeenCalledWith({ checkId: 1, finishedAt: -1 });
    expect(mocks.skip).toHaveBeenCalledWith(25);
    expect(mocks.limit).toHaveBeenCalledWith(25);
    const { pagination } = await res.json();
    expect(pagination).toEqual({ page: 2, limit: 25, total: 120, totalCapped: false, totalPages: 5, hasNext: true, hasPrev: true });
  });

  it("sorts by the check's name in the asked language, and searches names too", async () => {
    mocks.taggedChecks = [
      { scriptId: "z-orders", name: "Duplicate orders" } as { scriptId: string },
      { scriptId: "a-emails", name: "Invalid emails" } as { scriptId: string },
    ];
    await history("?sort_by=name&sort_order=asc&lang=en&search=duplicate");
    expect(mocks.runsFind).not.toHaveBeenCalled();
    const [pipeline] = mocks.aggregate.mock.calls[0] as [Record<string, unknown>[]];
    expect(pipeline[0]).toEqual({
      $match: { $or: [{ checkId: { $regex: "duplicate", $options: "i" } }, { checkId: { $in: ["z-orders"] } }] },
    });
    expect(JSON.stringify(pipeline[1])).toContain('["z-orders","a-emails"]');
    expect(mocks.countDocuments).toHaveBeenCalledWith(pipeline[0]?.$match, expect.anything());
  });

  it("clamps the page size", async () => {
    await history("?limit=100000");
    expect(mocks.limit).toHaveBeenLastCalledWith(500);
  });

  it("counts an unfiltered history from the collection's metadata instead of scanning it", async () => {
    mocks.total = 2_000_000;
    const { pagination } = await (await history()).json();
    expect(mocks.estimatedDocumentCount).toHaveBeenCalled();
    expect(mocks.countDocuments).not.toHaveBeenCalled();
    expect(pagination).toMatchObject({ total: 10_000, totalCapped: true, totalPages: 200 });
  });

  it("never skips past the counted runs", async () => {
    await history("?page=100000&limit=50");
    expect(mocks.skip).toHaveBeenLastCalledWith(199 * 50);
  });

  it("filters one check's runs within a date range, as the Analysis page asks", async () => {
    await history("?checkId=orders-check&startDate=2026-09-01T00:00:00.000Z&endDate=2026-09-08T00:00:00.000Z&limit=500");
    expect(mocks.runsFind.mock.calls[0]?.[0]).toEqual({
      checkId: { $eq: "orders-check" },
      finishedAt: { $gte: new Date("2026-09-01T00:00:00.000Z"), $lte: new Date("2026-09-08T00:00:00.000Z") },
    });
    expect(mocks.limit).toHaveBeenLastCalledWith(500);
  });

  it("never reads or returns samples, even when asked for them", async () => {
    const res = await history("?include_sample=true");
    const { projection } = mocks.runsFind.mock.calls[0]?.[1] ?? {};
    for (const field of ["sample", "raw_results", "rowKeys"]) expect(projection).not.toHaveProperty(field);
    expect((await res.json()).data[0]).not.toHaveProperty("sample");
  });

  it("limits runs to checks carrying every selected hashtag", async () => {
    mocks.taggedChecks = [
      { scriptId: "orders-check", hashtags: ["billing", "daily"] },
      { scriptId: "partial", hashtags: ["billing"] },
    ];
    const res = await history("?hashtags=billing,%20daily");
    expect(mocks.checksFind).toHaveBeenCalledWith({ hashtags: { $all: ["billing", "daily"] } }, expect.anything());
    expect(mocks.runsFind.mock.calls[0]?.[0]).toEqual({ checkId: { $in: ["orders-check"] } });
    expect((await res.json()).query_info.hashtags).toEqual(["billing", "daily"]);
  });

  it("returns an empty page for an unknown hashtag without querying runs", async () => {
    const res = await history("?hashtags=nope");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.pagination).toMatchObject({ total: 0, totalPages: 0, hasNext: false });
    expect(mocks.runsFind).not.toHaveBeenCalled();
    expect(mocks.countDocuments).not.toHaveBeenCalled();
  });

  it("answers 500 when the database fails", async () => {
    mocks.estimatedDocumentCount.mockImplementationOnce(() => {
      throw new Error("db down");
    });
    vi.spyOn(console, "error").mockImplementationOnce(() => undefined);
    expect((await history()).status).toBe(500);
  });
});
