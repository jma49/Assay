import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import { dryRunCheck, wrapForDryRun } from "./dry-run";

function fakeRunner(rows: { count?: number; sample?: unknown[]; fail?: string }) {
  const queries: string[] = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      queries.push(sql);
      if (rows.fail && sql.includes("count(*)")) throw new Error(rows.fail);
      if (sql.includes("count(*)")) return { rows: [{ n: rows.count ?? 0 }] };
      return { rows: rows.sample ?? [] };
    }),
  } as unknown as PoolClient;
  const run = <T>(fn: (c: PoolClient) => Promise<T>) => fn(client);
  return { run, queries };
}

describe("wrapForDryRun", () => {
  it("drops trailing semicolons and keeps a trailing comment off the closing parenthesis", () => {
    const { count } = wrapForDryRun("SELECT 1 -- note;;\n;");
    expect(count).toBe("SELECT count(*)::int AS n FROM (\nSELECT 1 -- note\n) AS assay_check");
  });
});

describe("dryRunCheck", () => {
  it("counts and samples a read-only query under a statement timeout", async () => {
    const { run, queries } = fakeRunner({ count: 3, sample: [{ id: 1 }] });
    const result = await dryRunCheck("-- orders missing a customer\nSELECT id FROM demo.orders WHERE customer_id IS NULL;", run);
    expect(result).toEqual({ ok: true, rowCount: 3, sample: [{ id: 1 }] });
    expect(queries[0]).toMatch(/^SET LOCAL statement_timeout = \d+$/);
    expect(queries[2]).toMatch(/LIMIT 5$/);
  });

  it("refuses writes before touching the database", async () => {
    const { run, queries } = fakeRunner({});
    const result = await dryRunCheck("DELETE FROM demo.orders", run);
    expect(result.ok).toBe(false);
    expect(queries).toHaveLength(0);
  });

  it("refuses statements that cannot be wrapped as a subquery", async () => {
    const { run, queries } = fakeRunner({});
    const result = await dryRunCheck("EXPLAIN SELECT 1", run);
    expect(result).toEqual({ ok: false, error: "A check must be a single SELECT or WITH query" });
    expect(queries).toHaveLength(0);
  });

  it("returns the database error instead of throwing", async () => {
    const { run } = fakeRunner({ fail: 'column "x" does not exist' });
    expect(await dryRunCheck("SELECT x FROM demo.orders", run)).toEqual({
      ok: false,
      error: 'column "x" does not exist',
    });
  });
});
