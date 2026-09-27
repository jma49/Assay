import { describe, expect, it } from "vitest";
import { digestContent, digestSlot, isValidTimeZone } from "./digest";

describe("digestSlot", () => {
  it("finds today's slot once it has passed, else yesterday's", () => {
    expect(digestSlot(new Date("2026-09-27T10:00:00Z"), 9, "UTC").toISOString()).toBe("2026-09-27T09:00:00.000Z");
    expect(digestSlot(new Date("2026-09-27T08:59:00Z"), 9, "UTC").toISOString()).toBe("2026-09-26T09:00:00.000Z");
  });

  it("uses the destination's time zone", () => {
    // 09:00 in Shanghai is 01:00 UTC.
    expect(digestSlot(new Date("2026-09-27T02:00:00Z"), 9, "Asia/Shanghai").toISOString()).toBe("2026-09-27T01:00:00.000Z");
    expect(digestSlot(new Date("2026-09-27T00:30:00Z"), 9, "Asia/Shanghai").toISOString()).toBe("2026-09-26T01:00:00.000Z");
  });

  it("follows daylight saving time", () => {
    // New York is UTC-4 in summer and UTC-5 in winter.
    expect(digestSlot(new Date("2026-07-01T15:00:00Z"), 9, "America/New_York").toISOString()).toBe("2026-07-01T13:00:00.000Z");
    expect(digestSlot(new Date("2026-12-01T15:00:00Z"), 9, "America/New_York").toISOString()).toBe("2026-12-01T14:00:00.000Z");
    // The day clocks go back (2026-11-01).
    expect(digestSlot(new Date("2026-11-01T20:00:00Z"), 9, "America/New_York").toISOString()).toBe("2026-11-01T14:00:00.000Z");
  });

  it("handles the start of a month", () => {
    expect(digestSlot(new Date("2026-10-01T00:30:00Z"), 9, "UTC").toISOString()).toBe("2026-09-30T09:00:00.000Z");
  });
});

describe("isValidTimeZone", () => {
  it("accepts IANA names only", () => {
    expect(isValidTimeZone("Asia/Shanghai")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});

describe("digestContent", () => {
  it("lists problems first and caps the list", () => {
    const content = digestContent(
      {
        total: 20,
        broken: [{ name: "Shipping" }],
        issues: Array.from({ length: 9 }, (_, i) => ({ name: `Check ${i}`, rowCount: i + 1 })),
        changes: 4,
        recovered: 1,
      },
      "en",
    );
    expect(content.title).toBe("Daily summary: 1 broken, 9 with issues");
    expect(content.tone).toBe("failure");
    expect(content.lines[0]).toBe("Broken: Shipping");
    expect(content.lines).toContain("…and 2 more");
    expect(content.lines.at(-1)).toBe("Last 24 h: 4 changes, 1 recovered");
  });

  it("says when everything is clean", () => {
    const content = digestContent({ total: 5, broken: [], issues: [], changes: 0, recovered: 0 }, "zh");
    expect(content.title).toBe("每日汇总：5 个检查全部正常");
    expect(content.tone).toBe("success");
  });
});
