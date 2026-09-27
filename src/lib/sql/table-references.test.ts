import { describe, expect, it } from "vitest";
import { demoChecks } from "../../../scripts/demo/checks";
import { tableReferences } from "./table-references";

describe("tableReferences", () => {
  it("reads FROM and JOIN targets, schema-qualified and folded to lower case", () => {
    expect(tableReferences("SELECT * FROM Demo.Orders o JOIN demo.payments p ON p.order_id = o.id")).toEqual([
      "demo.orders",
      "demo.payments",
    ]);
  });

  it("reads comma-separated FROM lists with aliases", () => {
    expect(tableReferences("SELECT 1 FROM a AS x, b y, public.c WHERE x.id = y.id")).toEqual(["a", "b", "public.c"]);
  });

  it("skips CTE names but reads the tables inside them", () => {
    const sql = `WITH recent AS MATERIALIZED (SELECT * FROM demo.orders WHERE created_at > now() - interval '1 day')
      SELECT * FROM recent r LEFT JOIN demo.customers c ON c.id = r.customer_id`;
    expect(tableReferences(sql)).toEqual(["demo.customers", "demo.orders"]);
  });

  it("reads subqueries in WHERE, and ignores FROM inside function calls", () => {
    const sql = `SELECT id FROM demo.orders o
      WHERE EXTRACT(YEAR FROM o.created_at) = 2026
        AND NOT EXISTS (SELECT 1 FROM demo.payments p WHERE p.order_id = o.id)
        AND trim(both ' ' from o.note) <> ''`;
    expect(tableReferences(sql)).toEqual(["demo.orders", "demo.payments"]);
  });

  it("ignores set-returning functions, comments and strings", () => {
    const sql = `-- FROM fake_comment
      SELECT 'FROM fake_string' FROM generate_series(1, 3) g JOIN "Mixed Case" m ON true /* JOIN nope */`;
    expect(tableReferences(sql)).toEqual(["Mixed Case"]);
  });

  it("finds a table in every demo check", () => {
    for (const check of demoChecks) {
      const tables = tableReferences(check.sqlContent);
      expect(tables.length, check.scriptId).toBeGreaterThan(0);
      expect(tables.every((t) => t.startsWith("demo.")), check.scriptId).toBe(true);
    }
  });
});
