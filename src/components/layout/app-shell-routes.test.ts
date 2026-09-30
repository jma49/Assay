import { describe, expect, it } from "vitest";
import { namesItsOwnTab, offersNewCheck, pageIntro, pageTitle, parentPage } from "./app-shell-routes";

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

describe("offersNewCheck", () => {
  it("shows New check on the check lists only", () => {
    for (const path of ["/checks", "/checks/manage"]) expect(offersNewCheck(path), path).toBe(true);
  });

  it("keeps other pages to their own actions", () => {
    for (const path of ["/checks/orders", "/checks/new", "/checks/manage/history", "/runs", "/runs/abc", "/data-analysis", "/approvals", "/admin/users", "/settings/api-keys"]) {
      expect(offersNewCheck(path), path).toBe(false);
    }
  });
});

describe("namesItsOwnTab", () => {
  it("is true for a check's page only", () => {
    expect(namesItsOwnTab("/checks/orders")).toBe(true);
    for (const path of ["/checks", "/checks/new", "/checks/manage", "/checks/manage/history", "/runs/abc"]) {
      expect(namesItsOwnTab(path), path).toBe(false);
    }
  });
});

describe("parentPage", () => {
  it("leads back from a check or a run to its list", () => {
    expect(parentPage("/checks/orders")?.href).toBe("/checks");
    expect(parentPage("/runs/abc")?.href).toBe("/runs");
  });

  it("is absent on list and form pages", () => {
    for (const path of ["/checks", "/checks/new", "/checks/manage", "/runs", "/approvals"]) {
      expect(parentPage(path), path).toBeUndefined();
    }
  });
});

describe("pageIntro", () => {
  it("introduces list pages in both languages", () => {
    for (const path of ["/checks", "/checks/new", "/checks/manage", "/runs", "/activity", "/coverage"]) {
      const intro = pageIntro(path);
      expect(intro?.en, path).toBeTruthy();
      expect(intro?.zh, path).toBeTruthy();
    }
  });

  it("leaves pages with their own heading alone", () => {
    expect(pageIntro("/checks/orders")).toBeUndefined();
    expect(pageIntro("/runs/abc")).toBeUndefined();
  });
});
