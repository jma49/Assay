import { describe, expect, it } from "vitest";
import { OUTCOME_COLOR, OUTCOME_DOT, OUTCOME_LABEL, OUTCOME_PILL, OUTCOME_TEXT } from "./status";

describe("outcome styles", () => {
  it("paints each outcome in its own status colour everywhere", () => {
    const tone = { error: "failure", issues: "attention", clean: "success" } as const;
    for (const [outcome, colour] of Object.entries(tone) as [keyof typeof tone, string][]) {
      expect(OUTCOME_TEXT[outcome]).toBe(`text-${colour}`);
      expect(OUTCOME_PILL[outcome]).toContain(`text-${colour}`);
      expect(OUTCOME_COLOR[outcome]).toBe(`var(--${colour})`);
    }
    expect(OUTCOME_DOT.issues).toBe("status-dot-issues");
  });

  it("names outcomes the same way in both languages", () => {
    expect(OUTCOME_LABEL.error).toEqual({ en: "Broken", zh: "出错" });
    expect(OUTCOME_LABEL.issues).toEqual({ en: "Issues", zh: "有问题" });
    expect(OUTCOME_LABEL.clean).toEqual({ en: "Clean", zh: "正常" });
  });
});
