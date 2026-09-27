import { describe, expect, it } from "vitest";
import { pageHasOwnAction, pageTitle } from "./app-shell-routes";

describe("pageTitle", () => {
  it.each([
    ["/checks", "Checks"],
    ["/checks/orders", "Checks"],
    ["/checks/new", "New check"],
    ["/checks/manage", "Manage checks"],
    ["/checks/manage/history", "Edit history"],
    ["/approvals", "Approvals"],
    ["/runs", "Runs"],
    ["/runs/abc", "Run"],
  ])("titles %s as %s", (pathname, title) => {
    expect(pageTitle(pathname)?.en).toBe(title);
  });

  it("has no title for unknown pages", () => {
    expect(pageTitle("/somewhere")).toBeUndefined();
  });
});

describe("pageHasOwnAction", () => {
  it("is true for a check, the new-check form and a run report", () => {
    for (const path of ["/checks/orders", "/checks/new", "/runs/abc"]) expect(pageHasOwnAction(path), path).toBe(true);
  });

  it("keeps the New check action on list and manage pages", () => {
    for (const path of ["/checks", "/checks/manage", "/checks/manage/history", "/runs", "/approvals"]) {
      expect(pageHasOwnAction(path), path).toBe(false);
    }
  });
});
