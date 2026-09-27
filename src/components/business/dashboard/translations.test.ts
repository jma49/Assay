import { describe, expect, it } from "vitest";
import { dashboardTranslations, translateDashboard } from "./translations";

describe("translateDashboard", () => {
  it("reads the table for the language", () => {
    expect(translateDashboard("en", "retry")).toBe(dashboardTranslations.en.retry);
    expect(translateDashboard("zh", "retry")).toBe(dashboardTranslations.zh.retry);
  });

  it("falls back to English for an unknown language", () => {
    expect(translateDashboard("fr", "retry")).toBe(dashboardTranslations.en.retry);
  });

  it("returns the key when there is no string for it", () => {
    expect(translateDashboard("en", "noSuchKey")).toBe("noSuchKey");
  });
});
