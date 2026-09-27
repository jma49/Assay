import { describe, expect, it } from "vitest";
import {
  runExpiresAt,
  runRetentionDays,
  sampleRows,
  diffRowKeys,
  fromLegacyStatus,
  isNotable,
  nextCheckState,
  normalizeRow,
  toLegacyStatus,
  type CheckState,
} from "./run";

describe("status names", () => {
  it("maps the stored names both ways", () => {
    for (const outcome of ["error", "issues", "clean"] as const) {
      expect(fromLegacyStatus(toLegacyStatus(outcome))).toBe(outcome);
    }
    expect(fromLegacyStatus(undefined)).toBe("clean");
  });
});

describe("rows", () => {
  it("makes rows JSON-safe", () => {
    expect(normalizeRow({ id: 10n, at: new Date("2026-09-26T00:00:00Z"), n: 1 })).toEqual({
      id: "10",
      at: "2026-09-26T00:00:00.000Z",
      n: 1,
    });
  });

  it("counts added, still-open and fixed rows", () => {
    expect(diffRowKeys(["a", "b", "c"], ["b", "c", "d", "e"])).toEqual({ added: 2, still: 2, fixed: 1 });
    expect(diffRowKeys([], [])).toEqual({ added: 0, still: 0, fixed: 0 });
  });
});

describe("check state", () => {
  const at = (h: number) => new Date(Date.UTC(2026, 8, 26, h));
  const state = (outcome: CheckState["outcome"], since: Date): CheckState => ({
    outcome,
    rowCount: 2,
    previousRowCount: null,
    since,
    lastRunId: "r0",
    lastRunAt: since,
  });

  it("keeps `since` while the outcome holds and resets it on a change", () => {
    const issues = state("issues", at(1));
    expect(nextCheckState(issues, { runId: "r1", outcome: "issues", rowCount: 4, finishedAt: at(2) })).toEqual({
      outcome: "issues",
      rowCount: 4,
      previousRowCount: 2,
      since: at(1),
      lastRunId: "r1",
      lastRunAt: at(2),
    });
    expect(nextCheckState(issues, { runId: "r2", outcome: "clean", rowCount: 0, finishedAt: at(3) }).since).toEqual(at(3));
    expect(nextCheckState(null, { runId: "r3", outcome: "clean", rowCount: 0, finishedAt: at(4) }).previousRowCount).toBeNull();
  });

  it("marks changes of outcome and newly found rows as notable", () => {
    const issues = state("issues", at(1));
    expect(isNotable(issues, "clean", null)).toBe(true);
    expect(isNotable(issues, "issues", { added: 1, still: 2, fixed: 0 })).toBe(true);
    expect(isNotable(issues, "issues", { added: 0, still: 2, fixed: 1 })).toBe(false);
    expect(isNotable(null, "clean", null)).toBe(false);
    expect(isNotable(null, "error", null)).toBe(true);
  });
});

describe("stateFromHistory", () => {
  const run = (runId: string, outcome: "error" | "issues" | "clean", rowCount: number, day: number) => ({
    runId,
    outcome,
    rowCount,
    finishedAt: new Date(Date.UTC(2026, 8, day)),
  });

  it("starts `since` at the beginning of the latest streak", async () => {
    const { stateFromHistory } = await import("./run");
    expect(
      stateFromHistory([run("r4", "issues", 4, 26), run("r3", "issues", 2, 25), run("r2", "clean", 0, 24), run("r1", "issues", 1, 23)]),
    ).toEqual({
      outcome: "issues",
      rowCount: 4,
      previousRowCount: 2,
      since: new Date(Date.UTC(2026, 8, 25)),
      lastRunId: "r4",
      lastRunAt: new Date(Date.UTC(2026, 8, 26)),
    });
  });

  it("handles a single run and no runs", async () => {
    const { stateFromHistory } = await import("./run");
    expect(stateFromHistory([run("r1", "clean", 0, 1)])).toMatchObject({ previousRowCount: null, since: new Date(Date.UTC(2026, 8, 1)) });
    expect(stateFromHistory([])).toBeNull();
  });
});

describe("sampleRows", () => {
  it("keeps at most maxRows rows and stops before the byte budget", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ i, text: "x".repeat(100) }));
    expect(sampleRows(rows, 5)).toHaveLength(5);
    expect(sampleRows(rows, 10, 360)).toHaveLength(3); // each row is 117 bytes
    expect(sampleRows([{ huge: "x".repeat(1000) }], 10, 100)).toHaveLength(0);
  });
});

describe("run retention", () => {
  it("defaults to 90 days, 0 keeps forever", () => {
    expect(runRetentionDays({})).toBe(90);
    expect(runRetentionDays({ RUN_RETENTION_DAYS: "30" })).toBe(30);
    expect(runRetentionDays({ RUN_RETENTION_DAYS: "abc" })).toBe(90);
    const at = new Date("2026-09-27T00:00:00Z");
    expect(runExpiresAt(at, 30)?.toISOString()).toBe("2026-10-27T00:00:00.000Z");
    expect(runExpiresAt(at, 0)).toBeNull();
  });
});
