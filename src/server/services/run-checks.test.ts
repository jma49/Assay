import { describe, expect, it, vi } from "vitest";
import { planRuns, runChecks, type CheckCandidate, type RunChecksDeps } from "./run-checks";

const now = new Date("2026-09-26T09:10:00Z");
const check = (scriptId: string, cronSchedule = "", last?: Date): CheckCandidate => ({
  scriptId,
  name: scriptId,
  isScheduled: Boolean(cronSchedule),
  cronSchedule,
  lastScheduledRunSlot: last,
});

describe("planRuns", () => {
  it("runs every check in 'all' mode", () => {
    expect(planRuns([check("a"), check("b", "0 9 * * *")], "all", now).due.map((r) => r.check.scriptId)).toEqual(["a", "b"]);
  });

  it("runs a scheduled check once per slot", () => {
    const { due, notDue } = planRuns(
      [check("due", "0 9 * * *"), check("done", "0 9 * * *", new Date("2026-09-26T09:00:00Z")), check("manual")],
      "scheduled",
      now,
    );
    expect(due).toEqual([{ check: check("due", "0 9 * * *"), slot: new Date("2026-09-26T09:00:00Z") }]);
    expect(notDue.map((c) => c.scriptId)).toEqual(["done", "manual"]);
  });
});

describe("runChecks", () => {
  const completed = { kind: "completed" as const, runId: "r", outcome: "clean" as const, rowCount: 0, diff: null, message: "", findings: "", stateUpdated: true };

  function deps(checks: CheckCandidate[], claims: Record<string, boolean> = {}): RunChecksDeps & { run: ReturnType<typeof vi.fn>; releaseSlot: ReturnType<typeof vi.fn> } {
    return {
      listChecks: async () => checks,
      claimSlot: async (scriptId) => claims[scriptId] ?? true,
      releaseSlot: vi.fn(async () => {}),
      run: vi.fn(async () => completed),
    };
  }

  it("gives the slot back when the run found the check busy or threw, so the next trigger retries it", async () => {
    const last = new Date("2026-09-25T09:00:00Z");
    const slot = new Date("2026-09-26T09:00:00Z");
    const d = deps([check("busy", "0 9 * * *", last), check("throws", "0 9 * * *"), check("ok", "0 9 * * *")]);
    d.run.mockImplementation(async (scriptId: string) => {
      if (scriptId === "busy") return { kind: "busy", runId: "other" };
      if (scriptId === "throws") throw new Error("mongo down");
      return completed;
    });
    const reports = await runChecks({ mode: "scheduled", now, trigger: { kind: "schedule" } }, d);
    expect(reports.map((r) => [r.scriptId, r.status])).toEqual([
      ["busy", "ran"],
      ["throws", "failed"],
      ["ok", "ran"],
    ]);
    expect(d.releaseSlot).toHaveBeenCalledTimes(2);
    expect(d.releaseSlot).toHaveBeenCalledWith("busy", slot, last);
    expect(d.releaseSlot).toHaveBeenCalledWith("throws", slot, null);
  });

  it("never releases a slot it did not claim, and survives a failed release", async () => {
    const d = deps([check("elsewhere", "0 9 * * *"), check("broken", "0 9 * * *")], { elsewhere: false });
    d.run.mockRejectedValue(new Error("boom"));
    (d.releaseSlot as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("mongo down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const reports = await runChecks({ mode: "scheduled", now, trigger: { kind: "schedule" } }, d);
    spy.mockRestore();
    expect(reports.map((r) => [r.scriptId, r.status])).toEqual([
      ["elsewhere", "claimed_elsewhere"],
      ["broken", "failed"],
    ]);
    expect(d.releaseSlot).toHaveBeenCalledTimes(1);
  });

  it("skips a slot another trigger claimed first", async () => {
    const d = deps([check("a", "0 9 * * *"), check("b", "0 9 * * *")], { b: false });
    const reports = await runChecks({ mode: "scheduled", now, trigger: { kind: "schedule" } }, d);
    expect(reports.map((r) => [r.scriptId, r.status])).toEqual([
      ["a", "ran"],
      ["b", "claimed_elsewhere"],
    ]);
    expect(d.run).toHaveBeenCalledTimes(1);
  });

  it("only lists what would run in a dry run", async () => {
    const d = deps([check("a", "0 9 * * *")]);
    const reports = await runChecks({ mode: "scheduled", now, dryRun: true, trigger: { kind: "schedule" } }, d);
    expect(reports).toEqual([{ scriptId: "a", name: "a", status: "would_run" }]);
    expect(d.run).not.toHaveBeenCalled();
  });

  it("reports a failing check and keeps running the others, never more than the limit at once", async () => {
    let active = 0;
    let peak = 0;
    const d = deps(["a", "b", "c", "d"].map((id) => check(id)));
    d.run.mockImplementation(async (scriptId: string) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      if (scriptId === "b") throw new Error("mongo down");
      return completed;
    });
    const reports = await runChecks({ mode: "all", now, concurrency: 2, trigger: { kind: "batch" } }, d);
    expect(reports.find((r) => r.scriptId === "b")).toMatchObject({ status: "failed", error: "mongo down" });
    expect(reports.filter((r) => r.status === "ran")).toHaveLength(3);
    expect(peak).toBe(2);
  });
});
