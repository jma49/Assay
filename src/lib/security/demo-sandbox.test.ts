import { describe, expect, it } from "vitest";
import { DEMO_AUTHOR, isDemoMode, runAccess } from "./demo-sandbox";

describe("isDemoMode", () => {
  it("is on only for the exact value true", () => {
    expect(isDemoMode({ DEMO_MODE: "true" })).toBe(true);
    for (const value of [undefined, "", "false", "1", "TRUE", "yes"]) {
      expect(isDemoMode({ DEMO_MODE: value })).toBe(false);
    }
  });
});

describe("runAccess", () => {
  it("lets anyone with script:execute run any check", () => {
    expect(runAccess({ canExecute: true, demoMode: false, scriptAuthor: "alice" })).toBe("allowed");
  });

  it("lets viewers run seeded checks only in demo mode", () => {
    expect(runAccess({ canExecute: false, demoMode: true, scriptAuthor: DEMO_AUTHOR })).toBe("demo");
    expect(runAccess({ canExecute: false, demoMode: false, scriptAuthor: DEMO_AUTHOR })).toBe("forbidden");
  });

  it("never lets viewers run other people's checks, even in demo mode", () => {
    for (const author of ["alice", "", null, undefined, "demo-seed ", "Demo-Seed"]) {
      expect(runAccess({ canExecute: false, demoMode: true, scriptAuthor: author })).toBe("forbidden");
    }
  });
});
