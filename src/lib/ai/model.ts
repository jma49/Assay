import type { LanguageModel } from "ai";

/**
 * All AI calls go through Vercel AI Gateway with plain "provider/model"
 * strings: on Vercel it authenticates with OIDC, locally with the
 * VERCEL_OIDC_TOKEN from `vercel env pull` or an AI_GATEWAY_API_KEY.
 * AI_GATEWAY_MODEL overrides the default; the fallback is tried when the
 * primary model fails.
 */
const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";
const FALLBACK_MODELS = ["google/gemini-3-flash"];

export function aiModel(): LanguageModel {
  return process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL;
}

/** Gateway routing plus reporting: which feature and which user spent it. */
export function gatewayOptions(feature: string, userId?: string) {
  return {
    gateway: {
      models: FALLBACK_MODELS,
      tags: [`feature:${feature}`],
      ...(userId ? { user: userId } : {}),
    },
  };
}

/**
 * AI calls spend real credits, so they are off unless AI_ENABLED=true.
 * Locally a pulled VERCEL_OIDC_TOKEN would otherwise authenticate silently.
 */
export function aiEnabled(): boolean {
  return process.env.AI_ENABLED === "true";
}
