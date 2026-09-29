import { describe, expect, it } from "vitest";
import { commentText, numericLiteral, quoteIdent, quoteLiteral, quoteTable } from "./quote";

describe("quoteIdent", () => {
  it("double-quotes every name, so reserved words and mixed case stay names", () => {
    expect(quoteIdent("order")).toBe('"order"');
    expect(quoteIdent("CamelCase")).toBe('"CamelCase"');
    expect(quoteIdent("with space")).toBe('"with space"');
  });

  it("doubles embedded quotes, so a name cannot close its own quoting", () => {
    expect(quoteIdent('a"; DROP TABLE t; --')).toBe('"a""; DROP TABLE t; --"');
  });

  it("refuses an empty name and NUL", () => {
    expect(() => quoteIdent("")).toThrow("Invalid identifier");
    expect(() => quoteIdent("a\0b")).toThrow("Invalid identifier");
  });

  it("quotes schema and table separately", () => {
    expect(quoteTable("public", 'we"ird')).toBe('"public"."we""ird"');
  });
});

describe("quoteLiteral", () => {
  it("doubles single quotes and leaves backslashes alone (standard_conforming_strings)", () => {
    expect(quoteLiteral("O'Brien")).toBe("'O''Brien'");
    expect(quoteLiteral("x' OR '1'='1")).toBe("'x'' OR ''1''=''1'");
    expect(quoteLiteral("C:\\path\\")).toBe("'C:\\path\\'");
  });

  it("refuses NUL, which PostgreSQL text cannot hold", () => {
    expect(() => quoteLiteral("a\0")).toThrow("Invalid string literal");
  });
});

describe("numericLiteral", () => {
  it("accepts finite numbers only", () => {
    expect(numericLiteral(42)).toBe("42");
    expect(numericLiteral(-1.5)).toBe("-1.5");
    expect(numericLiteral(1e21)).toBe("1e+21");
    for (const value of [NaN, Infinity, "1", null, undefined]) expect(numericLiteral(value)).toBeNull();
  });
});

describe("commentText", () => {
  it("keeps a comment on one line, so text cannot end it and start SQL", () => {
    expect(commentText("title\nDROP TABLE t;\r\t ")).toBe("title DROP TABLE t;");
  });
});
