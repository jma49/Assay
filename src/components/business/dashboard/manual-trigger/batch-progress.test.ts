import { describe, expect, it } from "vitest";
import { batchCounts, itemOutcome } from "./batch-progress";

describe("batch progress", () => {
  it("counts items per status and the finished ones", () => {
    const items = (["pending", "running", "clean", "clean", "issues", "error", "skipped"] as const).map((status) => ({ status }));
    expect(batchCounts(items)).toEqual({ pending: 1, running: 1, skipped: 1, clean: 2, issues: 1, error: 1, done: 5 });
  });

  it("gives a finished item's outcome and nothing while it waits or runs", () => {
    expect(itemOutcome("issues")).toBe("issues");
    expect(itemOutcome("pending")).toBeNull();
    expect(itemOutcome("running")).toBeNull();
    expect(itemOutcome("skipped")).toBeNull();
  });
});
