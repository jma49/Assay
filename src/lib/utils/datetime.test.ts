import { describe, expect, it } from "vitest";
import { dayKeyParts, formatDateTime, formatRelative, formatShortDateTime, localDayKey } from "./datetime";

const now = new Date("2026-09-26T12:00:00Z");

describe("formatRelative", () => {
  it("uses relative words within a week", () => {
    expect(formatRelative("2026-09-26T11:59:40Z", "en", now)).toBe("just now");
    expect(formatRelative("2026-09-26T11:55:00Z", "en", now)).toBe("5 min. ago");
    expect(formatRelative("2026-09-26T09:00:00Z", "en", now)).toBe("3 hr. ago");
    expect(formatRelative("2026-09-24T12:00:00Z", "en", now)).toBe("2 days ago");
    expect(formatRelative("2026-09-24T12:00:00Z", "zh", now)).toBe("前天");
  });

  it("falls back to the short date after a week", () => {
    expect(formatRelative("2026-09-01T04:57:00Z", "en", now, "UTC")).toBe("Sep 1, 4:57 AM");
  });

  it("renders missing or invalid values as a dash", () => {
    expect(formatRelative(undefined, "en", now)).toBe("—");
    expect(formatRelative("not a date", "en", now)).toBe("—");
  });
});

describe("formatShortDateTime", () => {
  it("adds the year only for other years", () => {
    expect(formatShortDateTime("2025-12-31T23:00:00Z", "en", now, "UTC")).toBe("Dec 31, 2025, 11:00 PM");
  });
});

describe("formatDateTime", () => {
  it("formats in the given zone rather than a fixed one", () => {
    expect(formatDateTime("2026-09-24T04:57:54Z", "en", "Asia/Shanghai")).toContain("12:57:54 PM");
  });
});

describe("localDayKey and dayKeyParts", () => {
  it("groups by the viewer's calendar day", () => {
    expect(localDayKey("2026-09-24T02:00:00Z", "America/Los_Angeles")).toBe("2026-09-23");
    expect(localDayKey("2026-09-24T02:00:00Z", "Asia/Shanghai")).toBe("2026-09-24");
  });

  it("reads a day key without shifting it", () => {
    expect(dayKeyParts("2026-09-24", "en")).toEqual({ day: "24", month: "Sep" });
    expect(dayKeyParts("2026-09-24", "zh")).toEqual({ day: "24", month: "9月" });
  });
});
