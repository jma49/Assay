import { describe, expect, it } from "vitest";
import { safeRedirect } from "./redirect";

describe("safeRedirect", () => {
  it("keeps paths on this site", () => {
    expect(safeRedirect("/checks/orders?tab=history")).toBe("/checks/orders?tab=history");
  });

  it("never leaves the site", () => {
    for (const value of [null, undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "checks"]) {
      expect(safeRedirect(value)).toBe("/checks");
    }
  });
});
