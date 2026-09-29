import { describe, expect, it } from "vitest";
import { dayKeysBetween, formatDate, formatDayKey, formatDateTime, formatRelative, formatShortDateTime, formatTime, localDayKey } from "./datetime";

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

  it("puts the zone after the time in Chinese too", () => {
    expect(formatDateTime("2026-09-24T09:57:08Z", "zh", "America/Los_Angeles")).toBe("2026/09/24 02:57:08 PDT");
  });
});

describe("day keys", () => {
  it("groups by the viewer's calendar day", () => {
    expect(localDayKey("2026-09-24T02:00:00Z", "America/Los_Angeles")).toBe("2026-09-23");
    expect(localDayKey("2026-09-24T02:00:00Z", "Asia/Shanghai")).toBe("2026-09-24");
  });

  it("formats a day key without shifting it", () => {
    expect(formatDayKey("2026-09-24", "en")).toBe("Sep 24");
    expect(formatDayKey("2026-09-24", "zh")).toBe("9月24日");
    expect(formatDayKey("2026-09-24", "en", { weekday: true })).toBe("Thu, Sep 24");
    expect(formatDayKey("nope", "en")).toBe("—");
  });

  it("lists the days between two keys, both included", () => {
    expect(dayKeysBetween("2026-09-29", "2026-10-02")).toEqual(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
    expect(dayKeysBetween("2026-09-24", "2026-09-24")).toEqual(["2026-09-24"]);
    expect(dayKeysBetween("2026-09-25", "2026-09-24")).toEqual([]);
  });
});

describe("formatDate and formatTime", () => {
  it("formats the date alone, with optional fields", () => {
    expect(formatDate("2026-09-24T04:57:00Z", "en", { timeZone: "UTC" })).toBe("9/24/2026");
    expect(formatDate("2026-09-24T04:57:00Z", "zh", { timeZone: "UTC" })).toBe("2026/9/24");
    expect(formatDate("2026-09-24T04:57:00Z", "en", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" })).toBe(
      "Thu, Sep 24",
    );
  });

  it("formats hours and minutes", () => {
    expect(formatTime("2026-09-24T04:57:00Z", "en", "UTC")).toBe("04:57 AM");
    expect(formatTime("2026-09-24T16:57:00Z", "zh", "UTC")).toBe("16:57");
  });

  it("renders missing or invalid values as a dash", () => {
    expect(formatDate(undefined, "en")).toBe("—");
    expect(formatTime("not a date", "en")).toBe("—");
  });
});
