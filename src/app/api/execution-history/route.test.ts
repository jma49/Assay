import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  denied: null as Response | null,
  permissions: [] as string[],
  runs: [] as Record<string, unknown>[],
  find: vi.fn(),
  sort: vi.fn(),
  limit: vi.fn(),
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
    limit: (...args: unknown[]) => (mocks.limit(...args), cursor),
    toArray: async () => mocks.runs,
  };
  return {
    getMongoDbClient: () => ({
      getDb: async () => ({ collection: () => ({ find: (...args: unknown[]) => (mocks.find(...args), cursor) }) }),
    }),
  };
});

import { GET } from "./route";

const executions = (query = "") => GET(new NextRequest(`http://localhost/api/execution-history${query}`));
const lastQuery = () => mocks.find.mock.calls.at(-1)?.[0];

describe("GET /api/execution-history", () => {
  beforeEach(() => {
    mocks.denied = null;
    mocks.permissions = [];
    mocks.runs = [];
    mocks.find.mockClear();
    mocks.sort.mockClear();
    mocks.limit.mockClear();
  });

  it("needs history:read and returns the auth response when refused", async () => {
    mocks.denied = NextResponse.json({ message: "forbidden" }, { status: 403 });
    expect(await executions()).toBe(mocks.denied);
    expect(mocks.permissions).toEqual(["history:read"]);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("reads the newest runs, 500 by default", async () => {
    await executions();
    expect(lastQuery()).toEqual({});
    expect(mocks.sort).toHaveBeenCalledWith({ finishedAt: -1 });
    expect(mocks.limit).toHaveBeenCalledWith(500);
  });

  it("clamps the limit to 1..500", async () => {
    for (const [value, expected] of [["100000", 500], ["0", 1], ["-5", 1], ["abc", 500], ["20", 20]] as const) {
      await executions(`?limit=${value}`);
      expect(mocks.limit).toHaveBeenLastCalledWith(expected);
    }
  });

  it("filters by date range and check", async () => {
    await executions("?startDate=2026-09-01&endDate=2026-09-30&scriptId=orders-check");
    expect(lastQuery()).toEqual({
      finishedAt: { $gte: new Date("2026-09-01"), $lte: new Date("2026-09-30") },
      checkId: "orders-check",
    });
  });

  it("ignores invalid dates and scriptId=all", async () => {
    await executions("?startDate=not-a-date&endDate=2026-13-45&scriptId=all");
    expect(lastQuery()).toEqual({});

    await executions("?startDate=garbage&endDate=2026-09-30");
    expect(lastQuery()).toEqual({ finishedAt: { $lte: new Date("2026-09-30") } });
  });

  it("reports error runs as statusType failed", async () => {
    mocks.runs = [
      { _id: "a", checkId: "c1", finishedAt: "2026-09-01T00:00:00.000Z", outcome: "error", github_run_id: 7 },
      { _id: "b", checkId: "c2", finishedAt: "2026-09-02T00:00:00.000Z", outcome: "issues" },
      { _id: "c", checkId: "c3", finishedAt: "2026-09-03T00:00:00.000Z", outcome: "clean" },
    ];
    const records = await (await executions()).json();
    expect(records.map((r: { statusType: string }) => r.statusType)).toEqual(["failed", "attention_needed", "success"]);
    expect(records.map((r: { status: string }) => r.status)).toEqual(["failure", "success", "success"]);
    expect(records[0]).toMatchObject({ scriptId: "c1", script_name: "c1", createdAt: "2026-09-01T00:00:00.000Z", github_run_id: 7 });
  });
});
