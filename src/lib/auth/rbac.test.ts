import { describe, expect, it } from "vitest";
import { Permission, ROLE_PERMISSIONS, UserRole, canManageRole } from "./rbac";

describe("data source management", () => {
  it("is for admins only: a connection string can reach any database", () => {
    const holders = Object.values(UserRole).filter((role) => ROLE_PERMISSIONS[role].includes(Permission.DATASOURCE_MANAGE));
    expect(holders).toEqual([UserRole.ADMIN]);
  });
});

describe("canManageRole", () => {
  it("lets admins manage every role", () => {
    for (const role of Object.values(UserRole)) {
      expect(canManageRole(UserRole.ADMIN, role)).toBe(true);
    }
  });

  it("lets managers manage only developers and viewers", () => {
    expect(canManageRole(UserRole.MANAGER, UserRole.DEVELOPER)).toBe(true);
    expect(canManageRole(UserRole.MANAGER, UserRole.VIEWER)).toBe(true);
    // The roles route checks both the new role and the target's current one,
    // so this also stops a manager from demoting an admin or another manager.
    expect(canManageRole(UserRole.MANAGER, UserRole.ADMIN)).toBe(false);
    expect(canManageRole(UserRole.MANAGER, UserRole.MANAGER)).toBe(false);
  });

  it("lets developers and viewers manage nobody", () => {
    for (const role of Object.values(UserRole)) {
      expect(canManageRole(UserRole.DEVELOPER, role)).toBe(false);
      expect(canManageRole(UserRole.VIEWER, role)).toBe(false);
    }
  });
});
