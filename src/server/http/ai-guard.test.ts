import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APICallError } from "ai";

vi.mock("@/lib/cache/redis", () => ({ default: {} }));

import { AI_INPUT_LIMITS, type CounterStore } from "@/lib/security/ai-guard";
import { aiError, guardAiRequest } from "./ai-guard";
import type { ApiError } from "./route";

const countingStore = (start = 0): CounterStore => {
  let count = start;
  return { incr: async () => ++count, expire: async () => undefined };
};

const refusal = (promise: Promise<void>) => promise.then(() => null, (error: ApiError) => error);

describe("guardAiRequest", () => {
  beforeEach(() => vi.stubEnv("AI_ENABLED", "true"));
  afterEach(() => vi.unstubAllEnvs());

  it("refuses every request unless AI_ENABLED=true, so no credits are spent by default", async () => {
    vi.stubEnv("AI_ENABLED", "");
    expect(await refusal(guardAiRequest("user_1", { prompt: "hi" }, countingStore()))).toMatchObject({ status: 503, code: "ai_disabled" });
  });

  it("refuses an input over its cap", async () => {
    const error = await refusal(guardAiRequest("user_1", { sql: "x".repeat(AI_INPUT_LIMITS.sql + 1) }, countingStore()));
    expect(error).toMatchObject({ status: 413, code: "input_too_long" });
  });

  it("refuses over the hourly quota and says when to retry", async () => {
    const error = await refusal(guardAiRequest("user_1", { prompt: "hi" }, countingStore(1000)));
    expect(error).toMatchObject({ status: 429, code: "ai_rate_limited" });
    expect(Number(error?.headers?.["Retry-After"])).toBeGreaterThan(0);
  });

  it("lets a request through when the counter store is down", async () => {
    const broken: CounterStore = { incr: async () => Promise.reject(new Error("down")), expire: async () => undefined };
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await refusal(guardAiRequest("user_1", { prompt: "hi" }, broken))).toBeNull();
  });
});

describe("aiError", () => {
  const callError = (statusCode: number) =>
    new APICallError({ message: "upstream detail", url: "https://gateway", requestBodyValues: {}, statusCode });

  it("maps the provider's status to a stable code without its detail", () => {
    expect(aiError(callError(429)).code).toBe("ai_busy");
    expect(aiError(callError(401)).code).toBe("ai_not_configured");
    expect(aiError(callError(402)).code).toBe("ai_quota");
    expect(aiError(new Error("boom")).code).toBe("ai_unavailable");
    expect(aiError(callError(429)).message).not.toContain("upstream");
  });
});
