import { describe, expect, it, vi } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { draftCheck, type CheckDraft } from "./draft-check";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};

function draft(sql: string): CheckDraft {
  return {
    name: "Orders without a customer",
    scriptId: "orders-without-customer",
    description: "Each row is an order that has no customer.",
    scope: "orders",
    tags: ["orders"],
    sql,
    rationale: "orders.customer_id is nullable.",
  };
}

/** A model that answers with each draft in turn and records the prompts it saw. */
function mockModel(drafts: CheckDraft[]) {
  const prompts: string[] = [];
  let call = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async (options) => {
      prompts.push(JSON.stringify(options.prompt));
      const next = drafts[Math.min(call++, drafts.length - 1)];
      return {
        content: [{ type: "text", text: JSON.stringify(next) }],
        finishReason: { unified: "stop", raw: undefined },
        usage,
        warnings: [],
      };
    },
  });
  return { model, prompts };
}

describe("draftCheck", () => {
  it("returns a draft whose dry run passes on the first try", async () => {
    const { model } = mockModel([draft("SELECT id FROM demo.orders WHERE customer_id IS NULL")]);
    const dryRun = vi.fn(async () => ({ ok: true as const, rowCount: 2, sample: [] }));

    const result = await draftCheck({ request: "orders with no customer", schema: "demo.orders(id, customer_id)", model, dryRun });

    expect(result.attempts).toBe(1);
    expect(result.dryRun).toEqual({ ok: true, rowCount: 2, sample: [] });
    expect(result.draft.scriptId).toBe("orders-without-customer");
  });

  it("feeds a failed dry run back to the model once", async () => {
    const { model, prompts } = mockModel([
      draft("SELECT id FROM demo.order WHERE customer_id IS NULL"),
      draft("SELECT id FROM demo.orders WHERE customer_id IS NULL"),
    ]);
    const dryRun = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: 'relation "demo.order" does not exist' })
      .mockResolvedValueOnce({ ok: true, rowCount: 0, sample: [] });

    const result = await draftCheck({ request: "orders with no customer", schema: "demo.orders", model, dryRun });

    expect(result.attempts).toBe(2);
    expect(result.draft.sql).toContain("demo.orders");
    expect(prompts[1]).toContain('relation \\"demo.order\\" does not exist');
  });

  it("stops after the repair attempt and returns the failing draft", async () => {
    const { model } = mockModel([draft("SELECT nope")]);
    const dryRun = vi.fn(async () => ({ ok: false as const, error: "syntax error" }));

    const result = await draftCheck({ request: "anything", schema: "", model, dryRun });

    expect(result.attempts).toBe(2);
    expect(dryRun).toHaveBeenCalledTimes(2);
    expect(result.dryRun).toEqual({ ok: false, error: "syntax error" });
  });
});
