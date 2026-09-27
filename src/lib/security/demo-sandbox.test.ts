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

describe("demoRunBudgets", () => {
  it("limits accounts per account and guests per IP plus a shared cap", async () => {
    const { demoRunBudgets, DEMO_RUNS_PER_HOUR, GUEST_RUNS_PER_HOUR_TOTAL } = await import("./demo-sandbox");
    expect(demoRunBudgets({ id: "user_1", isGuest: false }, "1.2.3.4")).toEqual([
      { subject: "user_1", limit: DEMO_RUNS_PER_HOUR },
    ]);
    expect(demoRunBudgets({ id: "guest_x", isGuest: true }, "1.2.3.4")).toEqual([
      { subject: "ip:1.2.3.4", limit: DEMO_RUNS_PER_HOUR },
      { subject: "guests", limit: GUEST_RUNS_PER_HOUR_TOTAL },
    ]);
  });

  it("reads the first forwarded address", async () => {
    const { clientIp } = await import("./demo-sandbox");
    expect(clientIp(new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
