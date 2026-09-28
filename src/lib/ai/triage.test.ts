import { describe, expect, it } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { profileRows } from "./row-profile";
import { triagePrompt, triageRun, type Triage, type TriageInput } from "./triage";
import { triageToMarkdown } from "./triage-format";

const rows = [
  { id: 1, email: "ann@example.com", created_at: "2026-09-01T10:00:00Z", note: null },
  { id: 2, email: "bob@example", created_at: "2026-09-02T10:00:00Z", note: null },
  { id: 3, email: "bob@example", created_at: "2026-09-03T10:00:00Z", note: "x" },
];

const input: TriageInput = {
  check: { scriptId: "demo-invalid-customer-emails", name: "Invalid emails", sql: "SELECT * FROM demo.customers" },
  run: { outcome: "issues", message: "Found 3 rows", rowCount: rows.length, profile: profileRows(rows) },
  schema: "demo.customers(id bigint, email text)",
  language: "en",
};

describe("profileRows", () => {
  it("describes columns without keeping any value", () => {
    const profile = profileRows(rows);
    expect(profile.sampled).toBe(3);
    expect(profile.columns).toEqual([
      { column: "id", types: ["number"], nulls: 0, distinct: 3 },
      { column: "email", types: ["string"], nulls: 0, distinct: 2 },
      { column: "created_at", types: ["date"], nulls: 0, distinct: 3 },
      { column: "note", types: ["string"], nulls: 2, distinct: 2 },
    ]);
  });

  it("looks at 50 rows at most", () => {
    expect(profileRows(Array.from({ length: 80 }, (_, id) => ({ id }))).sampled).toBe(50);
  });
});

describe("triagePrompt", () => {
  it("never contains row values", () => {
    const prompt = triagePrompt(input);
    expect(prompt).not.toContain("ann@example.com");
    expect(prompt).not.toContain("bob@example");
    expect(prompt).toContain("- email: string, 0 null, 2 distinct");
  });
});

describe("triageRun", () => {
  it("returns the structured triage from the model", async () => {
    const answer: Triage = {
      kind: "data_issue",
      summary: "Two customers have emails without a domain suffix.",
      causes: ["Signup form accepts emails without a TLD"],
      nextSteps: ["Fix the validation", "Contact the customers"],
      fixedSql: null,
    };
    const model = new MockLanguageModelV4({
      doGenerate: async () => ({
        content: [{ type: "text", text: JSON.stringify(answer) }],
        finishReason: { unified: "stop", raw: undefined },
        usage: {
          inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 1, text: 1, reasoning: undefined },
        },
        warnings: [],
      }),
    });
    expect(await triageRun(input, { model })).toEqual(answer);
  });
});

describe("triageToMarkdown", () => {
  it("renders the kind, lists and a corrected query", () => {
    const markdown = triageToMarkdown(
      { kind: "check_error", summary: "Wrong table.", causes: ["Typo"], nextSteps: [], fixedSql: "SELECT 1" },
      "en",
    );
    expect(markdown).toContain("**Problem in the check** — Wrong table.");
    expect(markdown).toContain("- Typo");
    expect(markdown).not.toContain("Next steps");
    expect(markdown).toContain("```sql\nSELECT 1\n```");
  });
});
