import { describe, expect, it } from "vitest";
import { alertKindOf, buildAlertMessage, buildTestMessage, wantsAlert } from "./notify";

const at = new Date("2026-09-26T09:00:00Z");
const options = { language: "en" as const, url: "https://assay.example/checks/orders" };

describe("alertKindOf", () => {
  it("names what happened", () => {
    expect(alertKindOf({ type: "check.outcome_changed", from: "clean", to: "error", rowCount: 0, diff: null })).toBe("broken");
    expect(alertKindOf({ type: "check.outcome_changed", from: "clean", to: "issues", rowCount: 3, diff: null })).toBe("issues");
    expect(alertKindOf({ type: "check.new_rows", from: "issues", to: "issues", rowCount: 5, diff: null })).toBe("new_rows");
    expect(alertKindOf({ type: "check.outcome_changed", from: "issues", to: "clean", rowCount: 0, diff: null })).toBe("recovered");
  });
});

describe("buildAlertMessage", () => {
  it("describes new rows with the diff", () => {
    const message = buildAlertMessage(
      { type: "check.new_rows", from: "issues", to: "issues", rowCount: 7, diff: { added: 2, still: 5, fixed: 1 }, at },
      { name: "Duplicate orders" },
      options,
    );
    expect(message).toMatchObject({ kind: "new_rows", tone: "attention", title: "Duplicate orders: 2 rows new" });
    expect(message.lines).toEqual(["Now returns 7 rows", "2 new, 5 still open, 1 fixed"]);
    expect(message.text).toContain(options.url);
  });

  it("shows a shortened error for a broken check, in Chinese when asked", () => {
    const message = buildAlertMessage(
      { type: "check.outcome_changed", from: "clean", to: "error", rowCount: 0, diff: null, error: "x".repeat(400), at },
      { name: "订单" },
      { ...options, language: "zh" },
    );
    expect(message.title).toBe("订单 执行出错");
    expect(message.lines[0]).toHaveLength("错误：".length + 301);
    expect(message.lines[1]).toBe("之前：正常");
  });

  it("says when a check recovered", () => {
    const message = buildAlertMessage(
      { type: "check.outcome_changed", from: "issues", to: "clean", rowCount: 0, diff: null, at },
      { name: "Orders" },
      options,
    );
    expect(message).toMatchObject({ kind: "recovered", tone: "success", title: "Orders is clean again", lines: ["Was: issues"] });
  });

  it("builds a test message", () => {
    expect(buildTestMessage({ ...options, at }).title).toBe("Test alert from Assay");
  });
});

describe("wantsAlert", () => {
  it("filters by kind, then by tag when the destination has tags", () => {
    expect(wantsAlert({ alerts: ["broken"], tags: [] }, "issues", [])).toBe(false);
    expect(wantsAlert({ alerts: ["broken"], tags: [] }, "broken", ["x"])).toBe(true);
    expect(wantsAlert({ alerts: ["broken"], tags: ["finance"] }, "broken", ["ops"])).toBe(false);
    expect(wantsAlert({ alerts: ["broken"], tags: ["finance"] }, "broken", ["ops", "finance"])).toBe(true);
  });
});
