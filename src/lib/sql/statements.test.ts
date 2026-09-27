import { describe, expect, it } from "vitest";
import { splitStatements } from "./statements";

describe("splitStatements", () => {
  it("splits at top-level semicolons and drops empty or comment-only pieces", () => {
    expect(splitStatements("SELECT 1; SELECT 2;\n-- done\n;")).toEqual(["SELECT 1", "SELECT 2"]);
  });

  it("keeps semicolons inside strings, identifiers and comments", () => {
    const sql = `SELECT 'a;b', "odd;name" FROM t -- trailing; comment
      WHERE x = 'it''s;fine' /* nested /* ; */ still */; SELECT 2`;
    const parts = splitStatements(sql);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain("'it''s;fine'");
    expect(parts[1]).toBe("SELECT 2");
  });

  it("treats backslashes as escapes only in E'' strings", () => {
    expect(splitStatements(String.raw`SELECT 'C:\'; SELECT 2`)).toEqual([String.raw`SELECT 'C:\'`, "SELECT 2"]);
    expect(splitStatements(String.raw`SELECT E'it\'s;' ; SELECT 2`)).toEqual([String.raw`SELECT E'it\'s;'`, "SELECT 2"]);
  });

  it("keeps a DO block whole, whatever its tag", () => {
    const sql = `DO $body$ BEGIN RAISE NOTICE 'x;'; PERFORM 1; END $body$; SELECT 1`;
    expect(splitStatements(sql)).toEqual([`DO $body$ BEGIN RAISE NOTICE 'x;'; PERFORM 1; END $body$`, "SELECT 1"]);
  });

  it("does not treat a CASE ... END or a column named begin as a block", () => {
    expect(splitStatements("SELECT CASE WHEN a THEN 1 END AS begin FROM t; SELECT 2")).toHaveLength(2);
  });

  it("does not mistake a positional parameter for a dollar quote", () => {
    expect(splitStatements("SELECT $1; SELECT 2")).toEqual(["SELECT $1", "SELECT 2"]);
  });
});

describe("splitStatements on the demo checks", () => {
  it("reads every demo check as exactly one statement", async () => {
    const { demoChecks } = await import("../../../scripts/demo/checks");
    for (const check of demoChecks) {
      expect(splitStatements(check.sqlContent), check.scriptId).toHaveLength(1);
    }
  });
});
