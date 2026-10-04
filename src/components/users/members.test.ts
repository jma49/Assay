import { describe, expect, it } from "vitest";
import { UserRole } from "@/lib/types/approval";
import { countByRole, getRoleInfo, pageSlice, type MemberRole } from "./members";

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
  it("labels each role in the given language", () => {
    expect(getRoleInfo(UserRole.ADMIN, "en").label).toBe("System administrator");
    expect(getRoleInfo(UserRole.MANAGER, "en").description).toBe("Manage checks, approve changes, assign roles");
    expect(getRoleInfo(UserRole.DEVELOPER, "zh").label).toBe("开发者");
    expect(getRoleInfo(UserRole.VIEWER, "zh").label).toBe("查看者");
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

