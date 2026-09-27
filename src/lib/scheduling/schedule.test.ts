import { describe, expect, it } from "vitest";
import { cronError, cronForPreset, nextScheduledRun, presetForCron, scheduleProblem, SCHEDULE_PRESETS } from "./schedule";

describe("presets", () => {
  it("round-trips every preset and tolerates extra spaces", () => {
    for (const preset of SCHEDULE_PRESETS) {
      expect(presetForCron(cronForPreset(preset.value))).toBe(preset.value);
    }
    expect(presetForCron(" 0  9 * * * ")).toBe("daily_09");
    expect(presetForCron("0 8 * * 1")).toBe("custom");
    expect(presetForCron("")).toBe("none");
  });

  it("offers only valid expressions", () => {
    for (const preset of SCHEDULE_PRESETS) expect(cronError(preset.cron)).toBeNull();
  });
});

describe("cronError", () => {
  it("requires exactly five fields", () => {
    expect(cronError("0 9 * *")).toMatch(/five fields/);
    expect(cronError("0 0 9 * * *")).toMatch(/five fields/);
  });

  it("rejects out-of-range values", () => {
    expect(cronError("61 * * * *")).toMatch(/Invalid cron/);
    expect(cronError("0 25 * * *", "zh")).toMatch(/无效/);
  });
});

describe("nextScheduledRun", () => {
  it("finds weekly and monthly runs, not only the next 24 hours", () => {
    const now = new Date("2026-09-26T12:00:00Z"); // a Saturday
    expect(nextScheduledRun("0 9 * * 1", now)?.toISOString()).toBe("2026-09-28T09:00:00.000Z");
    expect(nextScheduledRun("0 9 1 * *", now)?.toISOString()).toBe("2026-10-01T09:00:00.000Z");
    expect(nextScheduledRun("nope", now)).toBeNull();
  });
});

describe("scheduleProblem", () => {
  it("requires a cron for scheduled checks and validates any given cron", () => {
    expect(scheduleProblem(true, "")).toMatch(/needs a cron/);
    expect(scheduleProblem(true, "0 9 * * *")).toBeNull();
    expect(scheduleProblem(false, "")).toBeNull();
    expect(scheduleProblem(false, "bad")).toBeNull();
    expect(scheduleProblem(undefined, "bad")).toMatch(/five fields/);
    expect(scheduleProblem(true, undefined)).toBeNull();
    expect(scheduleProblem(true, 5)).toMatch(/must be a string/);
  });
});
