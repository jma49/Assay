import { describe, expect, it } from "vitest";
import { MAX_REMINDERS, reminderContent, reminderDue } from "./reminders";

const h = (n: number) => new Date(Date.UTC(2026, 8, 27) + n * 3_600_000);

describe("reminderDue", () => {
  it("comes every afterHours from when the problem began", () => {
    expect(reminderDue(h(0), h(-100), h(3), 4, 0)).toBe(false);
    expect(reminderDue(h(0), h(-100), h(4), 4, 0)).toBe(true);
    expect(reminderDue(h(0), h(-100), h(7), 4, 1)).toBe(false);
    expect(reminderDue(h(0), h(-100), h(8), 4, 1)).toBe(true);
  });

  it("counts from the destination's creation for older problems, and stops after the last one", () => {
    expect(reminderDue(h(0), h(50), h(51), 4, 0)).toBe(false);
    expect(reminderDue(h(0), h(50), h(54), 4, 0)).toBe(true);
    expect(reminderDue(h(0), h(-100), h(1000), 1, MAX_REMINDERS)).toBe(false);
  });
});

describe("reminderContent", () => {
  it("says how long and who owns it", () => {
    expect(reminderContent({ name: "Orders", outcome: "issues", rowCount: 3, owner: "ada" }, 4, "en")).toEqual({
      title: "Still has issues after 4 h: Orders",
      lines: ["Returns 3 rows", "Owner: ada", "Acknowledge to stop these reminders."],
    });
    expect(reminderContent({ name: "物流", outcome: "error", rowCount: 0 }, 48, "zh").title).toBe("物流 已出错 2 天，仍未处理");
  });
});
