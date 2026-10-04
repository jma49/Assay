import { describe, expect, it } from "vitest";
import { diffStats, lineDiff } from "./sql-diff";

describe("lineDiff", () => {
  it("marks identical text as unchanged", () => {
    expect(lineDiff("SELECT 1\nFROM t", "SELECT 1\nFROM t")).toEqual([
      { kind: "same", text: "SELECT 1" },
      { kind: "same", text: "FROM t" },
    ]);
  });

  it("puts a replaced line's removal before its addition", () => {
    expect(lineDiff("SELECT a\nFROM t\nORDER BY a;", "SELECT a\nFROM t2\nORDER BY a;")).toEqual([
      { kind: "same", text: "SELECT a" },
      { kind: "removed", text: "FROM t" },
      { kind: "added", text: "FROM t2" },
      { kind: "same", text: "ORDER BY a;" },
    ]);
  });

  it("finds inserted and deleted lines", () => {
    const lines = lineDiff("a\nb\nc", "a\nc\nd");
    expect(lines).toEqual([
      { kind: "same", text: "a" },
      { kind: "removed", text: "b" },
      { kind: "same", text: "c" },
      { kind: "added", text: "d" },
    ]);
    expect(diffStats(lines)).toEqual({ added: 1, removed: 1 });
  });

  it("ignores line-ending style and trailing newlines", () => {
    expect(diffStats(lineDiff("a\r\nb\n", "a\nb"))).toEqual({ added: 0, removed: 0 });
  });

  it("falls back to a full replace for very long texts", () => {
    const long = Array.from({ length: 600 }, (_, i) => `line ${i}`).join("\n");
    const lines = lineDiff(long, `${long}\nextra`);
    expect(diffStats(lines)).toEqual({ added: 601, removed: 600 });
  });
});
