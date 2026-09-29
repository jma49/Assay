import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cached: null as unknown,
  statements: [] as string[],
  release: () => {},
}));

vi.mock("../cache/redis", () => ({ default: { get: async () => mocks.cached, setex: async () => "OK" } }));
vi.mock("./db", () => ({
  withReadOnlyTransaction: async (fn: (client: { query: (text: string) => Promise<{ rows: unknown[] }> }) => Promise<unknown>) =>
    fn({
      query: async (text: string) => {
        mocks.statements.push(text.trim().split(/\s+/).slice(0, 3).join(" "));
        if (text.includes("information_schema")) await new Promise<void>((resolve) => (mocks.release = resolve));
        return { rows: [{ table_schema: "demo", table_name: "orders", column_name: "id", data_type: "int", is_nullable: "NO" }] };
      },
    }),
}));

import { getSchemaTables } from "./db-schema";

describe("getSchemaTables", () => {
  beforeEach(() => {
    mocks.cached = null;
    mocks.statements = [];
  });

  it("reads the catalogue once for requests that miss the cache together, with a statement timeout", async () => {
    const first = getSchemaTables();
    const second = getSchemaTables();
    await vi.waitFor(() => expect(mocks.statements).toHaveLength(2));
    mocks.release();
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);
    expect(a).toEqual([{ schema: "demo", name: "orders", columns: [{ name: "id", type: "int", nullable: false }] }]);
    expect(mocks.statements).toEqual(["SET LOCAL statement_timeout", "SELECT c.table_schema, c.table_name,"]);
  });

  it("reads again once the first read finished", async () => {
    const first = getSchemaTables();
    await vi.waitFor(() => expect(mocks.statements).toHaveLength(2));
    mocks.release();
    await first;
    const second = getSchemaTables();
    await vi.waitFor(() => expect(mocks.statements).toHaveLength(4));
    mocks.release();
    await second;
  });

  it("uses the cache when it has the schema", async () => {
    mocks.cached = [{ schema: "public", name: "t", columns: [] }];
    expect(await getSchemaTables()).toEqual(mocks.cached);
    expect(mocks.statements).toEqual([]);
  });
});
