import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  permissions: [] as string[],
  taggedChecks: [] as { scriptId: string; hashtags?: string[] }[],
  runs: [] as Record<string, unknown>[],
  total: 0,
  checksFind: vi.fn(),
  runsFind: vi.fn(),
  sort: vi.fn(),
  skip: vi.fn(),
  limit: vi.fn(),
  countDocuments: vi.fn(),
}));

vi.mock("@/lib/auth/auth-utils", () => ({
  authorizeApiRequest: async (permission: string) => {
    mocks.permissions.push(permission);
    return mocks.denied ? { isValid: false, response: mocks.denied } : { isValid: true, user: { id: "user_viewer" }, userEmail: "v@example.com", isGuest: false };
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
          name === "sql_scripts"
            ? { find: (...args: unknown[]) => (mocks.checksFind(...args), { toArray: async () => mocks.taggedChecks }) }
            : {
                find: (...args: unknown[]) => (mocks.runsFind(...args), cursor),
                countDocuments: async (...args: unknown[]) => (mocks.countDocuments(...args), mocks.total),
              },
      }),
    }),
  };
});

import { GET } from "./route";

const history = (query = "") => GET(new NextRequest(`http://localhost/api/check-history${query}`));

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
    mocks.taggedChecks = [];
    mocks.runs = [run];
    mocks.total = 1;
    for (const fn of [mocks.checksFind, mocks.runsFind, mocks.sort, mocks.skip, mocks.limit, mocks.countDocuments]) fn.mockClear();
  });

  it("needs history:read and returns the auth response when refused", async () => {
    mocks.denied = NextResponse.json({ message: "forbidden" }, { status: 403 });
    expect(await history()).toBe(mocks.denied);
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
        script_name: "orders-check",
        execution_time: "2026-09-01T00:00:00.000Z",
        status: "success",
        statusType: "attention_needed",
        message: "2 rows",
        findings: "dupes",
        github_run_id: 42,
      },
    ]);
    expect(body.pagination).toEqual({ page: 1, limit: 50, total: 1, totalPages: 1, hasNext: false, hasPrev: false });
    expect(body.query_info).toEqual({ sort_by: "execution_time", sort_order: "desc", include_results: false });
  });

  it("passes filter, sort and paging to the runs query", async () => {
    mocks.total = 120;
    const res = await history("?page=2&limit=25&script_name=orders&status=failure&sort_by=script_name&sort_order=asc");
    const filter = { checkId: { $regex: "orders", $options: "i" }, outcome: "error" };
    expect(mocks.runsFind).toHaveBeenCalledWith(filter, expect.anything());
    expect(mocks.countDocuments).toHaveBeenCalledWith(filter);
    expect(mocks.sort).toHaveBeenCalledWith({ checkId: 1, finishedAt: -1 });
    expect(mocks.skip).toHaveBeenCalledWith(25);
    expect(mocks.limit).toHaveBeenCalledWith(25);
    const { pagination } = await res.json();
    expect(pagination).toEqual({ page: 2, limit: 25, total: 120, totalPages: 5, hasNext: true, hasPrev: true });
  });

  it("clamps the page size", async () => {
    await history("?limit=100000");
    expect(mocks.limit).toHaveBeenCalledWith(200);
  });

  it("only reads and returns raw_results when include_results=true", async () => {
    await history();
    expect(mocks.runsFind.mock.calls[0][1].projection).not.toHaveProperty("raw_results");

    const res = await history("?include_results=true");
    expect(mocks.runsFind.mock.calls[1][1].projection).toHaveProperty("raw_results", 1);
    const body = await res.json();
    expect(body.data[0].raw_results).toEqual([{ id: 1 }]);
    expect(body.query_info.include_results).toBe(true);
  });

  it("limits runs to checks carrying every selected hashtag", async () => {
    mocks.taggedChecks = [
      { scriptId: "orders-check", hashtags: ["billing", "daily"] },
      { scriptId: "partial", hashtags: ["billing"] },
    ];
    const res = await history("?hashtags=billing,%20daily");
    expect(mocks.checksFind).toHaveBeenCalledWith({ hashtags: { $all: ["billing", "daily"] } }, expect.anything());
    expect(mocks.runsFind.mock.calls[0][0]).toEqual({ checkId: { $in: ["orders-check"] } });
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
    mocks.countDocuments.mockImplementationOnce(() => {
      throw new Error("db down");
    });
    vi.spyOn(console, "error").mockImplementationOnce(() => undefined);
    expect((await history()).status).toBe(500);
  });
});
