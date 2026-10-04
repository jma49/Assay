import { describe, expect, it } from "vitest";
import type { SchemaTable } from "@/contracts/schema";
import { computeCoverage } from "./coverage";

const table = (schema: string, name: string): SchemaTable => ({
  schema,
  name,
  columns: [{ name: "id", type: "bigint", nullable: false }],
});

const tables = [table("demo", "orders"), table("demo", "payments"), table("public", "orders"), table("demo", "products")];

describe("computeCoverage", () => {
  it("counts each check once per table and lists uncovered tables first", () => {
    const report = computeCoverage(tables, [
      { scriptId: "a", name: "A", sqlContent: "SELECT * FROM demo.orders o JOIN demo.orders p ON p.id = o.id" },
      { scriptId: "b", name: "B", sqlContent: "SELECT * FROM demo.payments" },
    ]);
    expect(report.covered).toBe(2);
    expect(report.tables.map((t) => t.table)).toEqual(["demo.products", "public.orders", "demo.orders", "demo.payments"]);
    expect(report.tables[2]?.checks).toEqual([{ scriptId: "a", name: "A", cnName: undefined }]);
  });

  it("resolves bare names to public first, then to a unique schema", () => {
    const report = computeCoverage(tables, [
      { scriptId: "a", name: "A", sqlContent: "SELECT * FROM orders" },
      { scriptId: "b", name: "B", sqlContent: "SELECT * FROM products" },
    ]);
    const checksOf = (name: string) => report.tables.find((t) => t.table === name)?.checks.map((c) => c.scriptId);
    expect(checksOf("public.orders")).toEqual(["a"]);
    expect(checksOf("demo.orders")).toEqual([]);
    expect(checksOf("demo.products")).toEqual(["b"]);
  });

  it("reports references to tables the database does not have", () => {
    const report = computeCoverage(tables, [{ scriptId: "old", name: "Old", sqlContent: "SELECT * FROM demo.refunds" }]);
    expect(report.unknown).toEqual([{ scriptId: "old", table: "demo.refunds" }]);
  });
});
