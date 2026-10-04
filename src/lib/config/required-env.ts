import { REQUIRED_ENV_NAMES } from "./env";

type Env = Record<string, string | undefined>;

/** Without these a production server cannot sign anyone in or reach its data (kind "required" in env.ts). */
export const REQUIRED_PRODUCTION_ENV = REQUIRED_ENV_NAMES;

function isSet(env: Env, name: string): boolean {
  return (env[name] ?? "").trim() !== "";
}

/**
 * Only a production Node.js server checks its configuration on start. The
 * build runs with NODE_ENV=production too but has no secrets (CI, Vercel),
 * and development and tests run without a full environment.
 */
export function shouldEnforceRequiredEnv(env: Env): boolean {
  return (
    env.NODE_ENV === "production" &&
    env.NEXT_RUNTIME === "nodejs" &&
    env.NEXT_PHASE !== "phase-production-build"
  );
}

// Fallbacks the app already honours: appUrl() (src/server/integrations/config.ts)
// uses the production domain Vercel provides when APP_URL is unset.
const FALLBACKS: Partial<Record<(typeof REQUIRED_PRODUCTION_ENV)[number], string>> = {
  APP_URL: "VERCEL_PROJECT_PRODUCTION_URL",
};

/** The required variables that are unset or blank, in a fixed order. */
export function missingRequiredEnv(env: Env): string[] {
  return REQUIRED_PRODUCTION_ENV.filter((name) => {
    const fallback = FALLBACKS[name];
    return !isSet(env, name) && !(fallback && isSet(env, fallback));
  });
}

/** Names only: the message must never carry a value. */
export function missingEnvMessage(missing: readonly string[]): string {
  return (
    `Assay refuses to start: missing required environment variable(s) ${missing.join(", ")}. ` +
    "Set them (see .env.example and docs/deployment.md) and restart."
  );
}

interface OptionalFeature {
  feature: string;
  /** The feature is on when every variable of at least one group is set. */
  anyOf: readonly (readonly string[])[];
  whenOff: string;
}

// Upstash Redis is left out: its client already warns when the URL is missing.
const OPTIONAL_FEATURES: readonly OptionalFeature[] = [
  {
    feature: "sign-in providers",
    anyOf: [
      ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    ],
    whenOff: "no one can sign in with Google or GitHub",
  },
  {
    feature: "alerts and data sources",
    anyOf: [["ASSAY_SECRET_KEY"]],
    whenOff: "alert channels and added data sources cannot be saved",
  },
  {
    feature: "alert dispatch endpoint",
    anyOf: [["CRON_SECRET"]],
    whenOff: "POST /api/notifications/dispatch rejects every call",
  },
  {
    feature: "error tracking",
    anyOf: [["SENTRY_DSN"]],
    whenOff: "errors are not sent to Sentry",
  },
];

export interface DisabledFeature {
  feature: string;
  variables: string[];
  whenOff: string;
}

/** Optional features that stay off because their variables are unset. */
export function disabledOptionalFeatures(env: Env): DisabledFeature[] {
  return OPTIONAL_FEATURES.filter(
    ({ anyOf }) => !anyOf.some((group) => group.every((name) => isSet(env, name))),
  ).map(({ feature, anyOf, whenOff }) => ({ feature, variables: anyOf.flat(), whenOff }));
}
