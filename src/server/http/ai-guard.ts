import { APICallError, RetryError } from "ai";
import redis from "@/lib/cache/redis";
import { aiEnabled } from "@/lib/ai/model";
import { AI_INPUT_LIMITS, AI_REQUESTS_PER_HOUR, consumeQuota, findOversizedField, type CounterStore } from "@/lib/security/ai-guard";
import { ApiError } from "./route";

/**
 * Refuses an AI request by throwing an ApiError, or returns to go on: AI
 * must be turned on, every input within its cap, and the caller within the
 * hourly quota. A Redis outage lets requests through (logged) rather than
 * taking AI features down; the input caps still apply.
 */
export async function guardAiRequest(
  userId: string,
  fields: Parameters<typeof findOversizedField>[0],
  store: CounterStore = redis,
): Promise<void> {
  if (!aiEnabled()) throw new ApiError(503, "ai_disabled", "AI features are turned off on this server (AI_ENABLED)");

  const oversized = findOversizedField(fields);
  if (oversized) {
    throw new ApiError(413, "input_too_long", `${oversized} is longer than ${AI_INPUT_LIMITS[oversized]} characters`);
  }

  let quota: Awaited<ReturnType<typeof consumeQuota>>;
  try {
    quota = await consumeQuota(store, userId, Date.now());
  } catch (error) {
    console.error("[AI guard] Rate limit check failed, allowing request:", error);
    return;
  }
  if (!quota.allowed) {
    throw new ApiError(429, "ai_rate_limited", `At most ${AI_REQUESTS_PER_HOUR} AI requests an hour; try again later`, {
      "Retry-After": String(quota.retryAfterSeconds),
    });
  }
}

function statusOf(error: unknown): number | undefined {
  if (RetryError.isInstance(error)) return statusOf(error.lastError);
  if (APICallError.isInstance(error)) return error.statusCode;
  return undefined;
}

/** A failed model call as an error safe to show; the raw error stays in the server log. */
export function aiError(error: unknown): ApiError {
  const status = statusOf(error);
  if (status === 429) return new ApiError(500, "ai_busy", "The AI service is busy; try again shortly");
  if (status === 401 || status === 403) return new ApiError(500, "ai_not_configured", "The AI service is not set up or refused access");
  if (status === 402) return new ApiError(500, "ai_quota", "The AI service is out of credits");
  return new ApiError(500, "ai_unavailable", "The AI service is unavailable; try again shortly");
}
