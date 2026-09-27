import { describe, expect, it } from "vitest";
import { CHECK_STATS_PIPELINE, toCheckStats } from "./check-stats";

describe("toCheckStats", () => {
  it("returns zeros when the collection is empty", () => {
    expect(toCheckStats([])).toEqual({
      totalCount: 0,
      successCount: 0,
      failureCount: 0,
      needsAttentionCount: 0,
    });
  });

  it("maps the grouped row to counts", () => {
    expect(
      toCheckStats([
        {
          _id: null,
          totalCount: 10,
          successCount: 6,
          failureCount: 3,
          needsAttentionCount: 1,
        },
      ]),
    ).toEqual({
      totalCount: 10,
      successCount: 6,
      failureCount: 3,
      needsAttentionCount: 1,
    });
  });
});

describe("CHECK_STATS_PIPELINE", () => {
  it("counts each run once, by outcome", () => {
    const group = CHECK_STATS_PIPELINE[0].$group;
    expect(JSON.stringify(group.successCount)).toContain('["$outcome","clean"]');
    expect(JSON.stringify(group.needsAttentionCount)).toContain('["$outcome","issues"]');
    expect(JSON.stringify(group.failureCount)).toContain('["$outcome","error"]');
  });
});
