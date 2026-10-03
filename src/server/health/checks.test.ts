import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkHealth, schedulerProbe, type Probe } from "./checks";

const okProbe = (name: Probe["name"]): Probe => ({ name, run: async () => {} });

describe("checkHealth", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports ok when every probe passes", async () => {
    const report = await checkHealth([okProbe("mongodb"), okProbe("redis")]);
    expect(report.status).toBe("ok");
    expect(report.checks).toMatchObject([
      { name: "mongodb", status: "ok" },
      { name: "redis", status: "ok" },
    ]);
    for (const check of report.checks) expect(typeof check.latencyMs).toBe("number");
  });

  it("reports degraded when a probe throws, without leaking the error", async () => {
    const report = await checkHealth([
      okProbe("mongodb"),
      {
        name: "postgres",
        run: async () => {
          throw new Error("postgres://secret@host");
        },
      },
    ]);
    expect(report.status).toBe("degraded");
    expect(report.checks).toMatchObject([
      { name: "mongodb", status: "ok" },
      { name: "postgres", status: "down" },
    ]);
    expect(JSON.stringify(report)).not.toContain("secret");
  });

  it("treats unconfigured components as ok", async () => {
    const report = await checkHealth([{ name: "redis", run: async () => "unconfigured" as const }]);
    expect(report.status).toBe("ok");
    expect(report.checks).toEqual([{ name: "redis", status: "unconfigured" }]);
  });

  it("marks a hanging probe as down after the timeout", async () => {
    const report = await checkHealth(
      [{ name: "mongodb", run: () => new Promise<"unconfigured" | void>(() => {}) }],
      50,
    );
    expect(report.status).toBe("degraded");
    expect(report.checks[0]?.status).toBe("down");
  });
});

describe("schedulerProbe", () => {
  it("is unconfigured when the scheduler never ran", async () => {
    const probe = schedulerProbe(async () => null);
    await expect(probe.run()).resolves.toBe("unconfigured");
  });
  it("passes when the heartbeat is fresh", async () => {
    const probe = schedulerProbe(async () => ({ _id: "s", updatedAt: new Date() }));
    await expect(probe.run()).resolves.toBeUndefined();
  });
  it("fails when the heartbeat is stale", async () => {
    const probe = schedulerProbe(async () => ({
      _id: "s",
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    }));
    await expect(probe.run()).rejects.toThrow();
  });
});
