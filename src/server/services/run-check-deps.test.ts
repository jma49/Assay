import { describe, expect, it } from "vitest";
import { checkTimeoutMs } from "./run-check-deps";

describe("checkTimeoutMs", () => {
  it("defaults to 30 seconds and clamps to 1 s – 5 min", () => {
    expect(checkTimeoutMs({})).toBe(30_000);
    expect(checkTimeoutMs({ CHECK_TIMEOUT_MS: "abc" })).toBe(30_000);
    expect(checkTimeoutMs({ CHECK_TIMEOUT_MS: "10" })).toBe(1_000);
    expect(checkTimeoutMs({ CHECK_TIMEOUT_MS: "999999" })).toBe(300_000);
    expect(checkTimeoutMs({ CHECK_TIMEOUT_MS: "45000" })).toBe(45_000);
  });
});
