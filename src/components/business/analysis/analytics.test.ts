import { describe, expect, it } from "vitest";
import { buildAnalytics, collectTags, historyQuery, withTags, type ExecutionRecord, type ScriptSummary } from "./analytics";

const run = (scriptId: string, statusType: ExecutionRecord["statusType"], createdAt: string): ExecutionRecord => ({
  _id: `${scriptId}-${createdAt}`,
  scriptId,
  statusType,
  createdAt,
});

const scripts: ScriptSummary[] = [
  { scriptId: "a", name: "A", hashtags: ["x", "y"] },
  { scriptId: "b", hashtags: ["x"] },
  { scriptId: "c", name: "C" },
];

const runs = [
  run("a", "success", "2026-09-25T10:00:00"),
  run("a", "failed", "2026-09-26T10:00:00"),
  run("b", "success", "2026-09-26T11:00:00"),
  run("b", "success", "2026-09-26T12:00:00"),
  run("b", "attention_needed", "2026-09-26T13:00:00"),
  run("gone", "success", "2026-09-26T14:00:00"),
];

describe("buildAnalytics", () => {
  const data = buildAnalytics(runs, scripts);

  it("counts runs by status and overall pass rate", () => {
    expect(data.statusDistribution).toEqual({ success: 4, failed: 1, attention_needed: 1 });
    expect(data.totalExecutions).toBe(6);
    expect(data.overallSuccessRate).toBeCloseTo(66.67, 1);
  });

  it("groups runs per local day, oldest first; anything but success counts as a failure", () => {
    expect(data.dailyTrend).toEqual([
      { date: "2026-09-25", executions: 1, successes: 1, failures: 0 },
      { date: "2026-09-26", executions: 5, successes: 3, failures: 2 },
    ]);
  });

  it("summarises each known check, best pass rate first, ignoring runs of removed checks", () => {
    expect(data.scriptAnalytics.map((s) => [s.scriptId, s.scriptName, s.totalExecutions, Math.round(s.successRate)])).toEqual([
      ["b", "b", 3, 67],
      ["a", "A", 2, 50],
      ["c", "C", 0, 0],
    ]);
    expect(data.scriptAnalytics[1].lastExecution).toBe("2026-09-26T10:00:00");
  });
});

describe("filters", () => {
  it("keeps runs of checks carrying every selected tag", () => {
    expect(withTags(runs, scripts, ["x", "y"]).map((r) => r.scriptId)).toEqual(["a", "a"]);
    expect(withTags(runs, scripts, [])).toBe(runs);
  });

  it("builds the history query for a range and check", () => {
    const now = new Date("2026-09-27T00:00:00Z");
    const params = historyQuery("7d", "a", now);
    expect(params.get("endDate")).toBe(now.toISOString());
    expect(new Date(params.get("startDate")!).getTime()).toBe(now.getTime() - 7 * 86_400_000);
    expect(params.get("scriptId")).toBe("a");
    expect([...historyQuery("all", "all", now).keys()]).toEqual([]);
  });

  it("collects tags once, sorted", () => {
    expect(collectTags(scripts)).toEqual(["x", "y"]);
  });
});
