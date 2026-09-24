import { describe, expect, it } from "vitest";
import { validateReadOnlySql } from "../../src/lib/sql/read-only-validator";
import { demoApprovals, demoChecks } from "./checks";

describe("demoChecks", () => {
  it.each(demoChecks.map((c) => [c.scriptId, c.sqlContent]))(
    "%s passes the read-only validator",
    (_id, sql) => {
      expect(validateReadOnlySql(sql)).toEqual({ isValid: true });
    }
  );

  it("uses unique, well-formed script ids", () => {
    const ids = demoChecks.map((c) => c.scriptId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^demo-[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("gives every scheduled check a cron schedule", () => {
    for (const check of demoChecks.filter((c) => c.isScheduled)) {
      expect(check.cronSchedule.split(" ")).toHaveLength(5);
    }
  });

  it.each(demoApprovals.map((a) => [a.requestId, a.check.sqlContent]))(
    "approval %s carries a read-only query",
    (_id, sql) => {
      expect(validateReadOnlySql(sql)).toEqual({ isValid: true });
    }
  );
});
