import { describe, expect, it, vi } from "vitest";
import type { Db } from "mongodb";
import { mongoRunChecksStore, planRuns, runChecks, SLOT_CLAIM_LEASE_MS, type CheckCandidate, type RunChecksDeps } from "./run-checks";

const now = new Date("2026-09-26T09:10:00Z");
const slot = new Date("2026-09-26T09:00:00Z");
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

  function deps(
    checks: CheckCandidate[],
    claims: Record<string, string | null> = {},
  ): RunChecksDeps & { run: ReturnType<typeof vi.fn>; completeSlot: ReturnType<typeof vi.fn>; releaseSlot: ReturnType<typeof vi.fn> } {
    return {
      listChecks: async () => checks,
      claimSlot: async (scriptId) => (scriptId in claims ? (claims[scriptId] ?? null) : `claim-${scriptId}`),
      completeSlot: vi.fn(async () => {}),
      releaseSlot: vi.fn(async () => {}),
      run: vi.fn(async () => completed),
    };
  }

  it("marks a finished slot completed, and gives the slot back when the run found the check busy or threw", async () => {
    const last = new Date("2026-09-25T09:00:00Z");
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
    expect(d.completeSlot).toHaveBeenCalledTimes(1);
    expect(d.completeSlot).toHaveBeenCalledWith("ok", slot, "claim-ok");
    expect(d.releaseSlot).toHaveBeenCalledTimes(2);
    expect(d.releaseSlot).toHaveBeenCalledWith("busy", "claim-busy");
    expect(d.releaseSlot).toHaveBeenCalledWith("throws", "claim-throws");
  });

  it("never releases a slot it did not claim, and survives a failed release", async () => {
    const d = deps([check("elsewhere", "0 9 * * *"), check("broken", "0 9 * * *")], { elsewhere: null });
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
    expect(d.releaseSlot).toHaveBeenCalledWith("broken", "claim-broken");
    expect(d.completeSlot).not.toHaveBeenCalled();
  });

  it("skips a slot another trigger claimed first", async () => {
    const d = deps([check("a", "0 9 * * *"), check("b", "0 9 * * *")], { b: null });
    const reports = await runChecks({ mode: "scheduled", now, trigger: { kind: "schedule" } }, d);
    expect(reports.map((r) => [r.scriptId, r.status])).toEqual([
      ["a", "ran"],
      ["b", "claimed_elsewhere"],
    ]);
    expect(d.run).toHaveBeenCalledTimes(1);
  });

  it("defers checks whose turn comes after startBy, without claiming their slot", async () => {
    const d = deps([check("first", "0 9 * * *"), check("second", "0 9 * * *")]);
    const claimSlot = vi.spyOn(d, "claimSlot");
    let time = 1_000;
    // The first run takes the clock past startBy; the second must not start.
    d.run.mockImplementation(async () => {
      time = 5_000;
      return completed;
    });
    const reports = await runChecks(
      { mode: "scheduled", now, trigger: { kind: "schedule" }, concurrency: 1, startBy: new Date(2_000), clock: () => time },
      d,
    );
    expect(reports.map((r) => [r.scriptId, r.status])).toEqual([
      ["first", "ran"],
      ["second", "deferred"],
    ]);
    expect(claimSlot).toHaveBeenCalledTimes(1);
  });

  it("only lists what would run in a dry run", async () => {
    const d = deps([check("a", "0 9 * * *")]);
    const reports = await runChecks({ mode: "scheduled", now, dryRun: true, trigger: { kind: "schedule" } }, d);
    expect(reports).toEqual([{ scriptId: "a", name: "a", status: "would_run" }]);
    expect(d.run).not.toHaveBeenCalled();
  });

describe("stale slot claims", () => {
  const staleAt = new Date(now.getTime() - SLOT_CLAIM_LEASE_MS - 60_000);
  const freshAt = new Date(now.getTime() - 60_000);
  const crashed = (): CheckCandidate => {
    const c = check("crashed", "0 9 * * *", new Date("2026-09-25T09:00:00Z"));
    c.slotClaim = { slot, at: staleAt };
    return c;
  };

  it("plans a crashed slot again, so the next trigger reclaims it", () => {
    const { due, notDue } = planRuns([crashed()], "scheduled", now);
    expect(due).toEqual([{ check: crashed(), slot }]);
    expect(notDue).toEqual([]);
  });

  it("does not plan a slot another trigger still holds", () => {
    const live = check("live", "0 9 * * *", new Date("2026-09-25T09:00:00Z"));
    live.slotClaim = { slot, at: freshAt };
    const { due, notDue } = planRuns([live], "scheduled", now);
    expect(due).toEqual([]);
    expect(notDue.map((c) => c.scriptId)).toEqual(["live"]);
  });

  it("never re-runs a completed slot", () => {
    const done = check("done", "0 9 * * *", slot);
    const { due, notDue } = planRuns([done], "scheduled", now);
    expect(due).toEqual([]);
    expect(notDue.map((c) => c.scriptId)).toEqual(["done"]);
  });

  it("runs a reclaimed slot and marks it completed afterwards", async () => {
    const completed = { kind: "completed" as const, runId: "r", outcome: "clean" as const, rowCount: 0, diff: null, message: "", findings: "", stateUpdated: true };
    const d: RunChecksDeps = {
      listChecks: async () => [crashed()],
      claimSlot: async () => "claim-2",
      completeSlot: vi.fn(async () => {}),
      releaseSlot: vi.fn(async () => {}),
      run: vi.fn(async () => completed),
    };
    const reports = await runChecks({ mode: "scheduled", now, trigger: { kind: "schedule" } }, d);
    expect(reports.map((r) => [r.scriptId, r.status])).toEqual([["crashed", "ran"]]);
    expect(d.completeSlot).toHaveBeenCalledWith("crashed", slot, "claim-2");
  });

  it("does not run a completed slot at the service level either", async () => {
    const d: RunChecksDeps = {
      listChecks: async () => [check("done", "0 9 * * *", slot)],
      claimSlot: vi.fn(async () => "claim-1"),
      completeSlot: vi.fn(async () => {}),
      releaseSlot: vi.fn(async () => {}),
      run: vi.fn(async () => {
        throw new Error("must not run");
      }),
    };
    const reports = await runChecks({ mode: "scheduled", now, trigger: { kind: "schedule" } }, d);
    expect(reports.map((r) => [r.scriptId, r.status])).toEqual([["done", "not_due"]]);
    expect(d.claimSlot).not.toHaveBeenCalled();
  });
});

describe("mongoRunChecksStore slot claims", () => {
  const fakeDb = (checks: Record<string, unknown>) => ({ collection: () => checks }) as unknown as Db;

  it("claims only an uncompleted slot with no live claim, and reclaims a stale one", async () => {
    const updateOne = vi.fn(async () => ({ modifiedCount: 1 }));
    const store = mongoRunChecksStore(fakeDb({ updateOne }));

    const claim = await store.claimSlot("orders", slot, now);

    expect(typeof claim).toBe("string");
    const [filter, update] = updateOne.mock.calls[0] as unknown as [
      object,
      { $set: { lastSlotClaimSlot: Date; lastSlotClaimAt: Date; lastSlotClaim: string } },
    ];
    expect(filter).toEqual({
      scriptId: "orders",
      $and: [
        { $or: [{ lastScheduledRunSlot: { $exists: false } }, { lastScheduledRunSlot: { $lt: slot } }] },
        {
          $or: [
            { lastSlotClaimAt: { $exists: false } },
            { lastSlotClaimAt: { $lt: new Date(now.getTime() - SLOT_CLAIM_LEASE_MS) } },
            { lastSlotClaimSlot: { $ne: slot } },
          ],
        },
      ],
    });
    expect(update.$set).toEqual({ lastSlotClaimSlot: slot, lastSlotClaimAt: now, lastSlotClaim: claim });
  });

  it("returns null when the slot is completed or another trigger holds it", async () => {
    const updateOne = vi.fn(async () => ({ modifiedCount: 0 }));
    const store = mongoRunChecksStore(fakeDb({ updateOne }));
    expect(await store.claimSlot("orders", slot, now)).toBeNull();
  });

  it("completes and releases only the claim it took", async () => {
    const updateOne = vi.fn(async () => ({}));
    const store = mongoRunChecksStore(fakeDb({ updateOne }));

    await store.completeSlot("orders", slot, "claim-1");
    await store.releaseSlot("orders", "claim-1");

    const [completeFilter, completeUpdate] = updateOne.mock.calls[0] as unknown as [object, { $set: object; $unset: object }];
    expect(completeFilter).toEqual({ scriptId: "orders", lastSlotClaim: "claim-1" });
    expect(completeUpdate).toEqual({
      $set: { lastScheduledRunSlot: slot },
      $unset: { lastSlotClaimSlot: "", lastSlotClaimAt: "", lastSlotClaim: "" },
    });
    const [releaseFilter, releaseUpdate] = updateOne.mock.calls[1] as unknown as [object, { $unset: object }];
    expect(releaseFilter).toEqual({ scriptId: "orders", lastSlotClaim: "claim-1" });
    expect(releaseUpdate).toEqual({ $unset: { lastSlotClaimSlot: "", lastSlotClaimAt: "", lastSlotClaim: "" } });
  });

  it("reads the open claim in listChecks", async () => {
    const claimAt = new Date(now.getTime() - 60_000);
    const toArray = async () => [
      {
        scriptId: "orders",
        name: "Orders",
        isScheduled: true,
        cronSchedule: "0 9 * * *",
        lastScheduledRunSlot: new Date("2026-09-25T09:00:00Z"),
        lastSlotClaimSlot: slot,
        lastSlotClaimAt: claimAt,
      },
    ];
    const store = mongoRunChecksStore(fakeDb({ find: () => ({ sort: () => ({ toArray }) }) }));
    const [candidate] = await store.listChecks("scheduled");
    expect(candidate?.slotClaim).toEqual({ slot, at: claimAt });
  });
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
