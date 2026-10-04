import { afterEach, describe, expect, it, vi } from "vitest";

const logWarn = vi.fn();
const logError = vi.fn();
vi.mock("@/server/logging/log", () => ({ logWarn, logError }));

const { checkStartupConfig } = await import("./startup-config");

const server = { NODE_ENV: "production", NEXT_RUNTIME: "nodejs" } as NodeJS.ProcessEnv;
const required = {
  BETTER_AUTH_SECRET: "fake-secret",
  MONGODB_URI: "mongodb://user:pass@localhost:27017/db",
  DATABASE_URL: "postgresql://user:pass@localhost/db",
  APP_URL: "http://localhost:3000",
};

function spyExit() {
  return vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
}

afterEach(() => {
  vi.restoreAllMocks();
  logWarn.mockReset();
  logError.mockReset();
});

describe("checkStartupConfig", () => {
  it("exits and names the missing variables, never their values", () => {
    const exit = spyExit();
    checkStartupConfig({ ...server, BETTER_AUTH_SECRET: "fake-secret" });
    expect(exit).toHaveBeenCalledWith(1);
    const message = String(logError.mock.calls[0][0]);
    expect(message).toContain("MONGODB_URI, DATABASE_URL, APP_URL");
    expect(message).not.toContain("fake-secret");
  });

  it("starts with the required variables and warns once per optional feature that is off", () => {
    const exit = spyExit();
    checkStartupConfig({ ...server, ...required, CRON_SECRET: "cron" });
    expect(exit).not.toHaveBeenCalled();
    expect(logWarn).toHaveBeenCalledTimes(3);
  });

  it("does nothing during the build", () => {
    const exit = spyExit();
    checkStartupConfig({ ...server, NEXT_PHASE: "phase-production-build" });
    expect(exit).not.toHaveBeenCalled();
    expect(logWarn).not.toHaveBeenCalled();
  });
});
