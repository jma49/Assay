import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cache: new Map<string, unknown>(),
  statements: [] as string[],
  release: () => {},
}));

vi.mock("../cache/redis", () => ({
  default: {
    get: async (key: string) => mocks.cache.get(key) ?? null,
    setex: async (key: string, _ttl: number, value: unknown) => (mocks.cache.set(key, value), "OK"),
  },
}));

import { getSchemaTables } from "./db-schema";

type Client = { query: (text: string) => Promise<{ rows: unknown[] }> };

/** A source whose catalogue read waits for mocks.release, so concurrent callers can be observed. */
function source(sourceId = "default", version = 0, table = "orders") {
  return {
    sourceId,
    version,
    source: {
      transaction: async <T,>(fn: (client: never) => Promise<T>) =>
        fn({
          query: async (text: string) => {
            mocks.statements.push(text.trim().split(/\s+/).slice(0, 3).join(" "));
            if (text.includes("information_schema")) await new Promise<void>((resolve) => (mocks.release = resolve));
            return { rows: [{ table_schema: "demo", table_name: table, column_name: "id", data_type: "int", is_nullable: "NO" }] };
          },
        } satisfies Client as never),
    },
  };
}

describe("getSchemaTables", () => {
  beforeEach(() => {
    mocks.cache.clear();
    mocks.statements = [];
  });

  it("reads the catalogue once for requests that miss the cache together, with a statement timeout", async () => {
    const target = source();
    const first = getSchemaTables(target);
    const second = getSchemaTables(target);
    await vi.waitFor(() => expect(mocks.statements).toHaveLength(2));
    mocks.release();
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);
    expect(a).toEqual([{ schema: "demo", name: "orders", columns: [{ name: "id", type: "int", nullable: false }] }]);
    expect(mocks.statements).toEqual(["SET LOCAL statement_timeout", "SELECT c.table_schema, c.table_name,"]);
  });

  it("reads again once the first read finished and the cache is empty", async () => {
    const first = getSchemaTables(source());
    await vi.waitFor(() => expect(mocks.statements).toHaveLength(2));
    mocks.release();
    await first;
    mocks.cache.clear();
    const second = getSchemaTables(source());
    await vi.waitFor(() => expect(mocks.statements).toHaveLength(4));
    mocks.release();
    await second;
  });

  it("uses the cache when it has the schema", async () => {
    mocks.cache.set("db_schema:v3:default:0", [{ schema: "public", name: "t", columns: [] }]);
    expect(await getSchemaTables(source())).toEqual([{ schema: "public", name: "t", columns: [] }]);
    expect(mocks.statements).toEqual([]);
  });

  it("caches per source and version, so an edited source never serves the old tables", async () => {
    mocks.cache.set("db_schema:v3:billing:1", [{ schema: "public", name: "old", columns: [] }]);
    const edited = getSchemaTables(source("billing", 2, "invoices"));
    await vi.waitFor(() => expect(mocks.statements).toHaveLength(2));
    mocks.release();
    expect((await edited)[0].name).toBe("invoices");
    expect(mocks.cache.has("db_schema:v3:billing:2")).toBe(true);
  });
});
