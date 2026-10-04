import { describe, expect, it } from "vitest";
import { startDeadline, summarize } from "./scheduled-trigger";
import type { CheckRunReport } from "./run-checks";

const report = (status: CheckRunReport["status"]): CheckRunReport =>
  status === "failed"
    ? { scriptId: "c", name: "c", status, error: "boom" }
    : status === "ran"
      ? { scriptId: "c", name: "c", status, result: { kind: "busy", runId: "r" } }
      : { scriptId: "c", name: "c", status };

describe("scheduled trigger", () => {
  it("counts reports by outcome", () => {
    const reports = (["ran", "ran", "failed", "deferred", "not_due", "claimed_elsewhere"] as const).map(report);
    expect(summarize(reports)).toEqual({ ran: 2, failed: 1, deferred: 1, skipped: 2 });
  });

  it("leaves room for the slowest run, saving it and sending alerts before the function limit", () => {
    // 300 s limit - 30 s query timeout - 15 s run overhead - 30 s alert reserve = 225 s.
    expect(startDeadline(0, 30_000).getTime()).toBe(225_000);
  });
});
