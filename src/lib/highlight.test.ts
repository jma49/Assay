import { describe, expect, it } from "vitest";
import { highlightShell, highlightSql } from "./highlight";

const kinds = (tokens: { text: string; kind: string }[]) => tokens.filter((t) => t.text.trim()).map((t) => `${t.kind}:${t.text.trim()}`);

describe("highlightSql", () => {
  it("marks keywords, strings, numbers and punctuation", () => {
    expect(kinds(highlightSql("WHERE o.status IN ('paid', 'shipped')"))).toEqual([
      "keyword:WHERE",
      "plain:o",
      "punctuation:.",
      "plain:status",
      "keyword:IN",
      "punctuation:(",
      "string:'paid'",
      "punctuation:,",
      "string:'shipped'",
      "punctuation:)",
    ]);
    expect(kinds(highlightSql("SELECT 1 FROM t -- note"))).toEqual(["keyword:SELECT", "number:1", "keyword:FROM", "plain:t", "comment:-- note"]);
  });

  it("marks a function call but not a keyword before a parenthesis", () => {
    expect(kinds(highlightSql("count(*) EXISTS ("))).toEqual(["function:count", "punctuation:(*)", "keyword:EXISTS", "punctuation:("]);
  });

  it("keeps every character", () => {
    const line = "  AND NOT EXISTS (";
    expect(highlightSql(line).map((t) => t.text).join("")).toBe(line);
  });
});

describe("highlightShell", () => {
  it("marks the command word after each separator, flags and comments", () => {
    expect(kinds(highlightShell("cd Assay && npm install"))).toEqual([
      "function:cd",
      "plain:Assay",
      "punctuation:&&",
      "function:npm",
      "plain:install",
    ]);
    expect(kinds(highlightShell("npm run seed:demo   # optional demo dataset"))).toEqual([
      "function:npm",
      "plain:run",
      "plain:seed:demo",
      "comment:# optional demo dataset",
    ]);
    expect(kinds(highlightShell("git clone --depth 1 repo"))).toEqual(["function:git", "plain:clone", "flag:--depth", "plain:1", "plain:repo"]);
  });
});
