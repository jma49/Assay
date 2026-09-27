import { describe, expect, it } from "vitest";
import { isDemoMode, isReservedAuthor, runAccess } from "./demo-sandbox";

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
    expect(runAccess({ canExecute: true, demoMode: false, demoSeed: undefined })).toBe("allowed");
  });

  it("lets viewers run seeded checks only in demo mode", () => {
    expect(runAccess({ canExecute: false, demoMode: true, demoSeed: true })).toBe("demo");
    expect(runAccess({ canExecute: false, demoMode: false, demoSeed: true })).toBe("forbidden");
  });

  it("never lets viewers run other people's checks, even in demo mode", () => {
    // Only the seed's flag counts; the author label, or a truthy look-alike, does not.
    for (const demoSeed of [undefined, null, false, "true", 1, "demo-seed"]) {
      expect(runAccess({ canExecute: false, demoMode: true, demoSeed })).toBe("forbidden");
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

  it("on Vercel, reads the addresses the edge sets", async () => {
    const { clientIp } = await import("./demo-sandbox");
    const vercel = { VERCEL: "1" };
    expect(clientIp(new Headers({ "x-vercel-forwarded-for": "9.9.9.9", "x-real-ip": "8.8.8.8", "x-forwarded-for": "1.1.1.1" }), vercel)).toBe("9.9.9.9");
    expect(clientIp(new Headers({ "x-real-ip": "8.8.8.8", "x-forwarded-for": "1.1.1.1" }), vercel)).toBe("8.8.8.8");
    expect(clientIp(new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }), vercel)).toBe("9.9.9.9");
    expect(clientIp(new Headers(), vercel)).toBe("unknown");
  });

  it("elsewhere, trusts only the entries its proxies appended, never a spoofed left-most one", async () => {
    const { clientIp } = await import("./demo-sandbox");
    const spoofed = new Headers({ "x-forwarded-for": "6.6.6.6, 9.9.9.9, 10.0.0.1", "x-real-ip": "6.6.6.6" });
    // Default: one proxy, so the right-most entry is the address it saw.
    expect(clientIp(spoofed, {})).toBe("10.0.0.1");
    expect(clientIp(spoofed, { TRUSTED_PROXY_COUNT: "2" })).toBe("9.9.9.9");
    // More proxies configured than entries: the left-most, still written by a proxy.
    expect(clientIp(new Headers({ "x-forwarded-for": "9.9.9.9" }), { TRUSTED_PROXY_COUNT: "3" })).toBe("9.9.9.9");
    // No proxy: no header can be trusted.
    expect(clientIp(spoofed, { TRUSTED_PROXY_COUNT: "0" })).toBe("unknown");
    // An invalid value falls back to the default.
    expect(clientIp(spoofed, { TRUSTED_PROXY_COUNT: "lots" })).toBe("10.0.0.1");
    expect(clientIp(new Headers(), {})).toBe("unknown");
  });
});

describe("isReservedAuthor", () => {
  it("reserves the seed's label in any case or spacing", () => {
    for (const author of ["demo-seed", " Demo-Seed ", "DEMO-SEED"]) expect(isReservedAuthor(author)).toBe(true);
    for (const author of ["alice", "", null, undefined, "demo-seeds"]) expect(isReservedAuthor(author)).toBe(false);
  });
});
