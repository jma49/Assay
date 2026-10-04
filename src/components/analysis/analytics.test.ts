import { describe, expect, it } from "vitest";
import {
  buildAnalytics,
  collectTags,
  historyQuery,
  rangeDays,
  runsFromHistory,
  withTags,
  type ExecutionRecord,
  type AnalyticsCheck,
} from "./analytics";

const run = (scriptId: string, outcome: ExecutionRecord["outcome"], createdAt: string): ExecutionRecord => ({
  _id: `${scriptId}-${createdAt}`,
  scriptId,
  outcome,
  createdAt,
});

const scripts: AnalyticsCheck[] = [
  { scriptId: "a", name: "A", hashtags: ["x", "y"] },
  { scriptId: "b", hashtags: ["x"] },
  { scriptId: "c", name: "C", cnName: "丙" },
];

const runs = [
  run("a", "clean", "2026-09-25T10:00:00Z"),
  run("a", "error", "2026-09-26T10:00:00Z"),
  run("b", "clean", "2026-09-26T11:00:00Z"),
  run("b", "clean", "2026-09-26T12:00:00Z"),
  run("b", "issues", "2026-09-26T13:00:00Z"),
  run("gone", "clean", "2026-09-26T14:00:00Z"),
];

const now = new Date("2026-09-27T12:00:00Z");

describe("buildAnalytics", () => {
  const data = buildAnalytics(runs, scripts, "7d", { now, timeZone: "UTC" });

  it("counts runs by outcome and the clean rate", () => {
    expect(data.statusDistribution).toEqual({ clean: 4, error: 1, issues: 1 });
    expect(data.totalExecutions).toBe(6);
    expect(data.cleanRate).toBeCloseTo(66.67, 1);
  });

  it("lists every day of the range, oldest first, split by outcome", () => {
    expect(data.dailyTrend).toHaveLength(7);
    expect(data.dailyTrend[0]?.date).toBe("2026-09-21");
    expect(data.dailyTrend.slice(-3)).toEqual([
      { date: "2026-09-25", runs: 1, clean: 1, issues: 0, error: 0 },
      { date: "2026-09-26", runs: 5, clean: 3, issues: 1, error: 1 },
      { date: "2026-09-27", runs: 0, clean: 0, issues: 0, error: 0 },
    ]);
  });

  it("groups runs by the viewer's calendar day", () => {
    const late = [run("a", "clean", "2026-09-26T02:00:00Z")];
    const trend = buildAnalytics(late, scripts, "7d", { now, timeZone: "America/Los_Angeles" }).dailyTrend;
    expect(trend.find((day) => day.runs > 0)?.date).toBe("2026-09-25");
  });

  it("summarises each known check, best clean rate first, ignoring runs of removed checks", () => {
    expect(data.scriptAnalytics.map((s) => [s.scriptId, s.scriptName, s.runs, Math.round(s.cleanRate)])).toEqual([
      ["b", "b", 3, 67],
      ["a", "A", 2, 50],
      ["c", "C", 0, 0],
    ]);
    expect(data.scriptAnalytics[1]?.counts).toEqual({ clean: 1, issues: 0, error: 1 });
    expect(data.scriptAnalytics[1]?.lastRun).toBe("2026-09-26T10:00:00Z");
    expect(data.scriptAnalytics[2]?.cnName).toBe("丙");
  });
});

describe("rangeDays", () => {
  it("covers the last N days up to today", () => {
    expect(rangeDays("7d", [], now, "UTC")).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ]);
    expect(rangeDays("30d", [], now, "UTC")).toHaveLength(30);
  });

  it("starts all time at the first run, and is empty without runs", () => {
    expect(rangeDays("all", runs, now, "UTC")).toEqual(["2026-09-25", "2026-09-26", "2026-09-27"]);
    expect(rangeDays("all", [], now, "UTC")).toEqual([]);
  });
});

describe("filters", () => {
  it("keeps runs of checks carrying every selected tag", () => {
    expect(withTags(runs, scripts, ["x", "y"]).map((r) => r.scriptId)).toEqual(["a", "a"]);
    expect(withTags(runs, scripts, [])).toBe(runs);
  });

  it("builds the history query from local midnight of the range's first day", () => {
    const params = historyQuery("7d", "a", now);
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    expect(params.get("startDate")).toBe(start.toISOString());
    expect(params.get("endDate")).toBe(now.toISOString());
    expect(params.get("checkId")).toBe("a");
    expect(params.get("limit")).toBe("500");
    expect([...historyQuery("all", "all", now).keys()]).toEqual(["limit"]);
  });

  it("reads the runs of a check-history body by outcome", () => {
    const body = {
      data: [
        { _id: "1", checkId: "a", finishedAt: "2026-09-26T10:00:00.000Z", outcome: "clean" as const },
        { _id: "2", checkId: "a", finishedAt: "2026-09-26T11:00:00.000Z", outcome: "error" as const },
        { _id: "3", checkId: "b", finishedAt: "2026-09-26T12:00:00.000Z", outcome: "issues" as const },
      ],
    };
    expect(runsFromHistory(body)).toEqual([
      { _id: "1", scriptId: "a", outcome: "clean", createdAt: "2026-09-26T10:00:00.000Z" },
      { _id: "2", scriptId: "a", outcome: "error", createdAt: "2026-09-26T11:00:00.000Z" },
      { _id: "3", scriptId: "b", outcome: "issues", createdAt: "2026-09-26T12:00:00.000Z" },
    ]);
    expect(runsFromHistory(null)).toEqual([]);
  });

  it("collects tags once, sorted", () => {
    expect(collectTags(scripts)).toEqual(["x", "y"]);
  });
});
