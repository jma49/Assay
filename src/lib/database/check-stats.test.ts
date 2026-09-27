import { describe, expect, it } from "vitest";
import { countRunsByOutcome } from "./check-stats";

describe("countRunsByOutcome", () => {
  it("counts each outcome with an indexed filter and totals them", async () => {
    const counts: Record<string, number> = { clean: 6, issues: 1, error: 3 };
    const filters: unknown[] = [];
    const runs = {
      countDocuments: async (filter: { outcome: string }) => {
        filters.push(filter);
        return counts[filter.outcome];
      },
    };
    expect(await countRunsByOutcome(runs as never)).toEqual({ totalCount: 10, successCount: 6, failureCount: 3, needsAttentionCount: 1 });
    expect(filters).toEqual([{ outcome: "clean" }, { outcome: "issues" }, { outcome: "error" }]);
  });
});
