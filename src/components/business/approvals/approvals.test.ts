import { describe, expect, it } from "vitest";
import { ApprovalStatus } from "@/lib/types/approval";
import { approvalCopy, approvalMessages, clampPage, decisionToast, pageCount, pageSlice, sqlView, statusTone } from "./approvals";

describe("sqlView", () => {
  it("diffs a pending edit against the live SQL", () => {
    expect(sqlView({ operationType: "update", sqlContent: "SELECT 2", currentSqlContent: "SELECT 1" })).toEqual({
      kind: "diff",
      before: "SELECT 1",
      after: "SELECT 2",
    });
  });

  it("shows the proposed SQL for a new check, or an edit whose check is gone or already decided", () => {
    expect(sqlView({ operationType: "create", sqlContent: "SELECT 1" })).toEqual({ kind: "sql", sql: "SELECT 1", removed: false });
    expect(sqlView({ operationType: "update", sqlContent: "SELECT 2" })).toEqual({ kind: "sql", sql: "SELECT 2", removed: false });
  });

  it("shows the SQL a delete removes", () => {
    expect(sqlView({ operationType: "delete", sqlContent: "SELECT 0", currentSqlContent: "SELECT 1" })).toEqual({
      kind: "sql",
      sql: "SELECT 1",
      removed: true,
    });
  });

  it("says when there is nothing to show", () => {
    expect(sqlView({ operationType: "create" })).toEqual({ kind: "none" });
  });
});

describe("approvalCopy", () => {
  it("has the same labels in both languages", () => {
    expect(Object.keys(approvalCopy("zh")).sort()).toEqual(Object.keys(approvalCopy("en")).sort());
    expect(approvalCopy("en").changeCount(3, 1)).toBe("+3 −1 lines");
  });
});

describe("statusTone", () => {
  it("colours approved green, rejected red and everything else as needing attention", () => {
    expect(statusTone(ApprovalStatus.APPROVED)).toEqual({ text: "text-success", dot: "status-dot-clean" });
    expect(statusTone(ApprovalStatus.REJECTED)).toEqual({ text: "text-failure", dot: "status-dot-error" });
    for (const status of [ApprovalStatus.PENDING, ApprovalStatus.WITHDRAWN, ApprovalStatus.DRAFT]) {
      expect(statusTone(status)).toEqual({ text: "text-attention", dot: "status-dot-issues" });
    }
  });
});

describe("pagination helpers", () => {
  const items = Array.from({ length: 23 }, (_, i) => i);

  it("counts pages, rounding up", () => {
    expect(pageCount(23, 10)).toBe(3);
    expect(pageCount(20, 10)).toBe(2);
    expect(pageCount(0, 10)).toBe(0);
  });

  it("pulls a page that no longer exists back to the last one", () => {
    expect(clampPage(2, 1)).toBe(1);
    expect(clampPage(3, 0)).toBe(1);
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(2, 3)).toBe(2);
  });

  it("slices one page of items", () => {
    expect(pageSlice(items, 1, 10)).toEqual(items.slice(0, 10));
    expect(pageSlice(items, 3, 10)).toEqual([20, 21, 22]);
  });
});

describe("messages", () => {
  it("confirms a decision in the reader's language", () => {
    expect(decisionToast("approve", "Dup orders", "en")).toBe("Approved Dup orders");
    expect(decisionToast("reject", "Dup orders", "en")).toBe("Rejected Dup orders");
    expect(decisionToast("approve", "Dup orders", "zh")).toBe("脚本 Dup orders 已批准");
    expect(decisionToast("reject", "Dup orders", "zh")).toBe("脚本 Dup orders 已拒绝");
  });

  it("keeps English error text free of Chinese", () => {
    const { forbidden, decisionFailed } = approvalMessages("en");
    expect(`${forbidden}${decisionFailed}`).not.toMatch(/[\u4e00-\u9fff]/);
  });
});
