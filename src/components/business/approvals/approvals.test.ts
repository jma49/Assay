import { describe, expect, it } from "vitest";
import { ApprovalStatus } from "@/lib/types/approval";
import { approvalMessages, clampPage, decisionToast, formatPageInfo, isPageInputKeyAllowed, pageCount, pageSlice, parsePageInput, statusTone } from "./approvals";

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

  it("fills the page-info template in order", () => {
    const template = "Showing %s-%s of %s results (Page %s of %s)";
    expect(formatPageInfo(template, { page: 3, totalPages: 3, totalItems: 23, pageSize: 10 })).toBe(
      "Showing 21-23 of 23 results (Page 3 of 3)",
    );
    expect(formatPageInfo(template, { page: 1, totalPages: 3, totalItems: 23, pageSize: 10 })).toBe(
      "Showing 1-10 of 23 results (Page 1 of 3)",
    );
  });

  it("accepts only existing pages in the jump box", () => {
    expect(parsePageInput("2", 3)).toBe(2);
    expect(parsePageInput("", 3)).toBeNull();
    expect(parsePageInput("0", 3)).toBeNull();
    expect(parsePageInput("4", 3)).toBeNull();
    expect(parsePageInput("abc", 3)).toBeNull();
  });

  it("lets digits and editing keys into the jump box", () => {
    expect(isPageInputKeyAllowed("7")).toBe(true);
    expect(isPageInputKeyAllowed("Backspace")).toBe(true);
    expect(isPageInputKeyAllowed("ArrowLeft")).toBe(true);
    expect(isPageInputKeyAllowed("e")).toBe(false);
    expect(isPageInputKeyAllowed("-")).toBe(false);
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
