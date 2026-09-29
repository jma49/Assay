/**
 * Sign-up is public, so every AI endpoint is reachable by anyone who makes an
 * account. These limits keep the AI key from being used as a free, unbounded
 * LLM: a per-user hourly quota and a cap on each input's length. Routes apply
 * them through guardAiRequest (src/server/http/ai-guard.ts).
 */
export const AI_REQUESTS_PER_HOUR = 30;
const WINDOW_SECONDS = 60 * 60;

export const AI_INPUT_LIMITS = {
  prompt: 2_000,
  sql: 20_000,
  errorMessage: 4_000,
} as const;

type LimitedField = keyof typeof AI_INPUT_LIMITS;

/** The first field longer than its limit, or null when all fit. */
export function findOversizedField(fields: Partial<Record<LimitedField, unknown>>): LimitedField | null {
  for (const [name, value] of Object.entries(fields) as [LimitedField, unknown][]) {
    if (typeof value === "string" && value.length > AI_INPUT_LIMITS[name]) return name;
  }
  return null;
}

export interface CounterStore {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

/**
 * Fixed-window counter: counts this request and says whether it is within
 * the limit. `scope` keeps separate budgets (AI requests, demo runs) apart.
 */
export async function consumeQuota(
  store: CounterStore,
  userId: string,
  now: number,
  limit = AI_REQUESTS_PER_HOUR,
  windowSeconds = WINDOW_SECONDS,
  scope = "ai",
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const windowStart = Math.floor(now / 1000 / windowSeconds) * windowSeconds;
  const key = `ratelimit:${scope}:${userId}:${windowStart}`;
  const count = await store.incr(key);
  if (count === 1) await store.expire(key, windowSeconds);
  const retryAfterSeconds = windowStart + windowSeconds - Math.floor(now / 1000);
  return { allowed: count <= limit, retryAfterSeconds };
}
