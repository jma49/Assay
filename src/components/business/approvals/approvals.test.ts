import { describe, expect, it } from "vitest";
import { ApprovalStatus } from "@/lib/types/approval";
import { approvalMessages, clampPage, decisionToast, pageCount, pageSlice, statusTone } from "./approvals";

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
