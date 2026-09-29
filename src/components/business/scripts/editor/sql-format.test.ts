import { describe, expect, it } from "vitest";
import { basicFormat, formatSql } from "./sql-format";

describe("formatSql", () => {
  it("formats PostgreSQL with upper-case keywords", async () => {
    expect(await formatSql("select id,\tname from orders where total > 0 and paid")).toBe(
      "SELECT\n  id,\n  name\nFROM\n  orders\nWHERE\n  total > 0\n  AND paid",
    );
  });
});

describe("basicFormat", () => {
  it("puts each clause and each AND/OR on its own line", () => {
    expect(basicFormat("select a from t where x = 1 and y = 2")).toBe("SELECT a\nFROM t\nWHERE x = 1\nand y = 2");
  });
});
