import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { checkTimeoutMs, FUNCTION_MAX_DURATION_S, MAX_TIMEOUT_MS } from "./run-check-deps";

describe("checkTimeoutMs", () => {
  it("defaults to 30 seconds and clamps to 1 s – what fits in one function", () => {
    expect(checkTimeoutMs({})).toBe(30_000);
    expect(checkTimeoutMs({ CHECK_TIMEOUT_MS: "abc" })).toBe(30_000);
    expect(checkTimeoutMs({ CHECK_TIMEOUT_MS: "10" })).toBe(1_000);
    expect(checkTimeoutMs({ CHECK_TIMEOUT_MS: "999999" })).toBe(MAX_TIMEOUT_MS);
    expect(MAX_TIMEOUT_MS).toBeLessThan(FUNCTION_MAX_DURATION_S * 1000 - 30_000);
    expect(checkTimeoutMs({ CHECK_TIMEOUT_MS: "45000" })).toBe(45_000);
  });
});

describe("maxDuration", () => {
  // Next.js reads `maxDuration` statically, so the routes hold a literal; keep it equal to the constant.
  it.each(["run-check", "run-all-scripts", "batches", "cron/run-scheduled", "mcp", "notifications/dispatch"])("is set on /api/%s", (route) => {
    const source = readFileSync(`src/app/api/${route}/route.ts`, "utf8");
    expect(source).toMatch(new RegExp(`export const maxDuration = ${FUNCTION_MAX_DURATION_S};`));
  });
});
