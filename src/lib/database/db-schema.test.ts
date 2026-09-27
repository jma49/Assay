import { describe, expect, it } from "vitest";
import { formatSchemaForAI, groupColumns } from "./db-schema";

const row = (table_schema: string, table_name: string, column_name: string) => ({
  table_schema,
  table_name,
  column_name,
  data_type: "text",
  is_nullable: "YES",
});

describe("groupColumns", () => {
  it("keeps same-named tables in different schemas apart", () => {
    const tables = groupColumns([row("demo", "orders", "id"), row("public", "orders", "ref"), row("demo", "orders", "total")]);
    expect(tables.map((t) => [`${t.schema}.${t.name}`, t.columns.map((c) => c.name)])).toEqual([
      ["demo.orders", ["id", "total"]],
      ["public.orders", ["ref"]],
    ]);
  });
});

describe("formatSchemaForAI", () => {
  it("writes one schema-qualified line per table with every column", () => {
    const text = formatSchemaForAI(groupColumns([row("demo", "orders", "id"), row("demo", "orders", "created_at")]));
    expect(text).toBe("demo.orders(id text, created_at text)");
  });

  it("says so when no table is visible", () => {
    expect(formatSchemaForAI([])).toMatch(/no tables/);
  });
});
