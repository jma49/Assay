import { describe, expect, it } from "vitest";
import { reportLine, resultDetail } from "./run-report";

const leak = 'relation "orders" violates check: (email)=(ada@example.com); host db.internal';
const completed = { kind: "completed" as const, runId: "r", outcome: "error" as const, rowCount: 0, diff: null, message: leak, findings: "", stateUpdated: true };

describe("run report lines", () => {
  it("shows only id, outcome and row count in public CI logs", () => {
    const lines = [
      reportLine({ scriptId: "orders", name: "Orders", status: "ran", result: completed }, true),
      reportLine({ scriptId: "orders", name: "Orders", status: "failed", error: leak }, true),
    ];
    expect(lines).toEqual(["- orders: error, 0 rows", "- orders: failed (details in the app and its server logs)"]);
    expect(lines.join("\n")).not.toMatch(/ada@|db\.internal|Orders/);
  });

  it("keeps the message and error text for local runs", () => {
    expect(reportLine({ scriptId: "orders", name: "Orders", status: "ran", result: completed }, false)).toBe(`- orders: error, 0 rows. ${leak}`);
    expect(reportLine({ scriptId: "orders", name: "Orders", status: "failed", error: "boom" }, false)).toBe("- orders: failed: boom");
  });

  it("describes skipped and unusual results", () => {
    expect(reportLine({ scriptId: "a", name: "A", status: "not_due" }, true)).toBe("- a: not due");
    expect(reportLine({ scriptId: "a", name: "A", status: "claimed_elsewhere" }, true)).toBe("- a: claimed elsewhere");
    expect(resultDetail({ kind: "busy", runId: "r" }, true)).toBe("already running");
    expect(resultDetail({ kind: "missing" }, true)).toBe("not found");
    expect(resultDetail({ ...completed, outcome: "issues", rowCount: 1, message: "" }, false)).toBe("issues, 1 row");
  });
});
