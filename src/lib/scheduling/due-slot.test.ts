import { describe, expect, it } from "vitest";
import { CATCH_UP_WINDOW_MS, dueSlot, nextRunAt } from "./due-slot";

const at = (iso: string) => new Date(iso);

describe("dueSlot", () => {
  it("runs a daily check when the trigger fires late", () => {
    expect(dueSlot("0 8 * * *", at("2026-09-26T08:25:00Z"), null)).toEqual(at("2026-09-26T08:00:00Z"));
  });

  it("counts a slot that falls exactly on the trigger time", () => {
    expect(dueSlot("*/30 * * * *", at("2026-09-26T08:30:00Z"), null)).toEqual(at("2026-09-26T08:30:00Z"));
  });

  it("does not run the same slot twice", () => {
    const slot = at("2026-09-26T08:00:00Z");
    expect(dueSlot("0 8 * * *", at("2026-09-26T08:30:00Z"), slot)).toBeNull();
    expect(dueSlot("0 8 * * *", at("2026-09-26T09:00:00Z"), slot)).toBeNull();
  });

  it("runs the next slot once it arrives", () => {
    const yesterday = at("2026-09-25T08:00:00Z");
    expect(dueSlot("0 8 * * *", at("2026-09-26T08:05:00Z"), yesterday)).toEqual(at("2026-09-26T08:00:00Z"));
  });

  it("drops slots older than the catch-up window", () => {
    const tooLate = new Date(at("2026-09-26T08:00:00Z").getTime() + CATCH_UP_WINDOW_MS + 60_000);
    expect(dueSlot("0 8 * * *", tooLate, null)).toBeNull();
  });

  it("ignores invalid expressions instead of throwing", () => {
    expect(dueSlot("not a cron", at("2026-09-26T08:00:00Z"), null)).toBeNull();
  });
});

describe("nextRunAt", () => {
  it("returns the next firing in UTC", () => {
    expect(nextRunAt("0 8 * * *", at("2026-09-26T08:00:00Z"))).toEqual(at("2026-09-27T08:00:00Z"));
    expect(nextRunAt("*/30 * * * *", at("2026-09-26T08:10:00Z"))).toEqual(at("2026-09-26T08:30:00Z"));
  });

  it("returns null for invalid expressions", () => {
    expect(nextRunAt("bad", at("2026-09-26T08:00:00Z"))).toBeNull();
  });
});
