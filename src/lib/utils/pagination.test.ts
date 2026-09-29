import { describe, expect, it } from "vitest";
import { describePage, formatPageInfo, isJumpInputKey, pageRange, pagerLabel, parseJumpPage } from "./pagination";

describe("parseJumpPage", () => {
  it("accepts pages that exist", () => {
    expect(parseJumpPage("1", 5)).toBe(1);
    expect(parseJumpPage("5", 5)).toBe(5);
  });

  it("rejects empty, non-numeric and out-of-range input", () => {
    expect(parseJumpPage("", 5)).toBeNull();
    expect(parseJumpPage("x", 5)).toBeNull();
    expect(parseJumpPage("0", 5)).toBeNull();
    expect(parseJumpPage("6", 5)).toBeNull();
  });
});

describe("isJumpInputKey", () => {
  it("lets digits and editing keys through", () => {
    expect(isJumpInputKey("7")).toBe(true);
    expect(isJumpInputKey("Backspace")).toBe(true);
    expect(isJumpInputKey("Tab")).toBe(true);
    expect(isJumpInputKey("ArrowLeft")).toBe(true);
  });

  it("blocks letters and signs", () => {
    expect(isJumpInputKey("e")).toBe(false);
    expect(isJumpInputKey("-")).toBe(false);
  });
});

describe("pageRange", () => {
  it("covers a full page", () => {
    expect(pageRange(2, 10, 25)).toEqual({ start: 11, end: 20 });
  });

  it("stops at the last item on the last page", () => {
    expect(pageRange(3, 10, 25)).toEqual({ start: 21, end: 25 });
  });

  it("stays within an empty list", () => {
    expect(pageRange(1, 10, 0)).toEqual({ start: 0, end: 0 });
  });
});

describe("formatPageInfo", () => {
  it("fills the template in order", () => {
    expect(formatPageInfo("%s-%s of %s (%s/%s)", { start: 11, end: 20, totalItems: 23, page: 2, totalPages: 3 })).toBe(
      "11-20 of 23 (2/3)",
    );
  });

  it("marks a total the server stopped counting at", () => {
    expect(formatPageInfo("%s-%s of %s (%s/%s)", { start: 1, end: 50, totalItems: 10000, page: 1, totalPages: 200, totalCapped: true })).toBe(
      "1-50 of 10000+ (1/200)",
    );
  });
});

describe("describePage", () => {
  const template = "Showing %s-%s of %s results (Page %s of %s)";

  it("fills the range for a page", () => {
    expect(describePage(template, { page: 1, totalPages: 3, totalItems: 23, pageSize: 10 })).toBe(
      "Showing 1-10 of 23 results (Page 1 of 3)",
    );
  });

  it("caps the range at the total on the last page", () => {
    expect(describePage(template, { page: 3, totalPages: 3, totalItems: 23, pageSize: 10 })).toBe(
      "Showing 21-23 of 23 results (Page 3 of 3)",
    );
  });
});

describe("pagerLabel", () => {
  it("names the rows on the page and the total", () => {
    expect(pagerLabel(1, 10, 12, "en")).toBe("1–10 of 12");
    expect(pagerLabel(2, 10, 12, "en")).toBe("11–12 of 12");
    expect(pagerLabel(2, 10, 12, "zh")).toBe("11–12，共 12 条");
  });
});
