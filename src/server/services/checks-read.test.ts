import { describe, expect, it } from "vitest";
import { runPoint, toSummary } from "./checks-read";

const at = (day: number) => new Date(Date.UTC(2026, 8, day, 9));

describe("runPoint", () => {
  it("reads a run's outcome, row count and finish time", () => {
    expect(runPoint({ _id: "r1", outcome: "issues", rowCount: 4, finishedAt: at(26) })).toEqual({
      runId: "r1",
      outcome: "issues",
      rowCount: 4,
      at: at(26).toISOString(),
    });
  });
});

describe("toSummary", () => {
  const check = { scriptId: "a", name: "A", hashtags: ["x"], isScheduled: true, cronSchedule: "0 9 * * *" };

  it("keeps the last 30 runs, oldest first", () => {
    const history = Array.from({ length: 35 }, (_, i) => ({ runId: `r${i}`, outcome: "clean" as const, rowCount: i, at: at(30 - (i % 28)).toISOString() }));
    const summary = toSummary(check, history);
    expect(summary.history).toHaveLength(30);
    expect(summary.history[29].rowCount).toBe(0);
    expect(summary.schedule).toBe("0 9 * * *");
    expect(summary.tags).toEqual(["x"]);
  });

  it("derives state from history when the check has none stored", () => {
    const summary = toSummary(check, [
      { runId: "r2", outcome: "issues", rowCount: 3, at: at(26).toISOString() },
      { runId: "r1", outcome: "issues", rowCount: 1, at: at(25).toISOString() },
      { runId: "r0", outcome: "clean", rowCount: 0, at: at(24).toISOString() },
    ]);
    expect(summary.state).toEqual({
      outcome: "issues",
      rowCount: 3,
      previousRowCount: 1,
      since: at(25).toISOString(),
      lastRunAt: at(26).toISOString(),
      lastRunId: "r2",
    });
  });

  it("has no state and no schedule for a manual check that never ran", () => {
    const summary = toSummary({ scriptId: "b", isScheduled: false, cronSchedule: "0 9 * * *" }, []);
    expect(summary).toMatchObject({ name: "b", schedule: null, state: null, history: [] });
  });
});
