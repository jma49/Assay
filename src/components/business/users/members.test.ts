import { describe, expect, it } from "vitest";
import { UserRole } from "@/lib/types/approval";
import { countByRole, formatPageInfo, getRoleInfo, isPageJumpKey, pageSlice, parsePageJump, type MemberRole } from "./members";

const member = (userId: string, role: UserRole): MemberRole => ({
  userId,
  email: `${userId}@example.com`,
  role,
  assignedBy: "admin@example.com",
  assignedAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  isActive: true,
});

describe("getRoleInfo", () => {
  it("labels each role through the translator", () => {
    const t = (key: string) => `<${key}>`;
    expect(getRoleInfo(UserRole.ADMIN, t).label).toBe("<adminRole>");
    expect(getRoleInfo(UserRole.MANAGER, t).description).toBe("<managerDesc>");
    expect(getRoleInfo(UserRole.DEVELOPER, t).label).toBe("<developerRole>");
    expect(getRoleInfo(UserRole.VIEWER, t).label).toBe("<viewerRole>");
  });
});

describe("countByRole", () => {
  it("counts every role, including ones nobody holds, in role order", () => {
    const counts = countByRole([member("a", UserRole.ADMIN), member("b", UserRole.VIEWER), member("c", UserRole.VIEWER)]);
    expect(counts).toEqual({ admin: 1, manager: 0, developer: 0, viewer: 2 });
    expect(Object.keys(counts)).toEqual(["admin", "manager", "developer", "viewer"]);
  });
});

describe("pageSlice", () => {
  const items = Array.from({ length: 23 }, (_, i) => i);

  it("returns the requested page and its 1-based range", () => {
    expect(pageSlice(items, 1, 10)).toEqual({ items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], page: 1, totalPages: 3, start: 1, end: 10 });
    expect(pageSlice(items, 3, 10)).toMatchObject({ items: [20, 21, 22], start: 21, end: 23 });
  });

  it("falls back to the last page when the list shrinks below the current one", () => {
    expect(pageSlice(items.slice(0, 20), 3, 10)).toMatchObject({ items: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19], page: 2, start: 11, end: 20 });
  });

  it("has no pages when there are no items", () => {
    expect(pageSlice([], 1, 10)).toMatchObject({ items: [], totalPages: 0 });
  });
});

describe("formatPageInfo", () => {
  it("fills the placeholders in order", () => {
    expect(formatPageInfo("%s-%s of %s (%s/%s)", [11, 20, 23, 2, 3])).toBe("11-20 of 23 (2/3)");
  });
});

describe("parsePageJump", () => {
  it("accepts only whole pages in range", () => {
    expect(parsePageJump("2", 3)).toBe(2);
    expect(parsePageJump("", 3)).toBeNull();
    expect(parsePageJump("0", 3)).toBeNull();
    expect(parsePageJump("4", 3)).toBeNull();
    expect(parsePageJump("x", 3)).toBeNull();
  });
});

describe("isPageJumpKey", () => {
  it("allows digits and editing keys only", () => {
    expect(isPageJumpKey("7")).toBe(true);
    expect(isPageJumpKey("Backspace")).toBe(true);
    expect(isPageJumpKey("Tab")).toBe(true);
    expect(isPageJumpKey("e")).toBe(false);
    expect(isPageJumpKey("-")).toBe(false);
  });
});
