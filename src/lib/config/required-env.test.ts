import { describe, expect, it } from "vitest";
import {
  REQUIRED_PRODUCTION_ENV,
  disabledOptionalFeatures,
  missingEnvMessage,
  missingRequiredEnv,
  shouldEnforceRequiredEnv,
} from "./required-env";

const complete = {
  BETTER_AUTH_SECRET: "fake-secret",
  MONGODB_URI: "mongodb://user:pass@localhost:27017/db",
  DATABASE_URL: "postgresql://user:pass@localhost/db",
  APP_URL: "http://localhost:3000",
};

describe("shouldEnforceRequiredEnv", () => {
  it("enforces on a production Node.js server", () => {
    expect(shouldEnforceRequiredEnv({ NODE_ENV: "production", NEXT_RUNTIME: "nodejs" })).toBe(true);
  });

  it("skips the production build, which runs without secrets", () => {
    expect(
      shouldEnforceRequiredEnv({
        NODE_ENV: "production",
        NEXT_RUNTIME: "nodejs",
        NEXT_PHASE: "phase-production-build",
      }),
    ).toBe(false);
  });

  it("skips the edge runtime, development and tests", () => {
    expect(shouldEnforceRequiredEnv({ NODE_ENV: "production", NEXT_RUNTIME: "edge" })).toBe(false);
    expect(shouldEnforceRequiredEnv({ NODE_ENV: "development", NEXT_RUNTIME: "nodejs" })).toBe(false);
    expect(shouldEnforceRequiredEnv({ NODE_ENV: "test", NEXT_RUNTIME: "nodejs" })).toBe(false);
    expect(shouldEnforceRequiredEnv({ NODE_ENV: "production" })).toBe(false);
  });
});

describe("missingRequiredEnv", () => {
  it("returns nothing when every variable is set", () => {
    expect(missingRequiredEnv(complete)).toEqual([]);
  });

  it("returns every name when nothing is set", () => {
    expect(missingRequiredEnv({})).toEqual([...REQUIRED_PRODUCTION_ENV]);
  });

  it("treats blank values as missing", () => {
    expect(missingRequiredEnv({ ...complete, APP_URL: "", DATABASE_URL: "   " })).toEqual([
      "DATABASE_URL",
      "APP_URL",
    ]);
  });
});

describe("missingRequiredEnv on Vercel", () => {
  it("accepts the Vercel production domain in place of APP_URL", () => {
    const withoutAppUrl = { ...complete, APP_URL: undefined };
    expect(missingRequiredEnv(withoutAppUrl)).toEqual(["APP_URL"]);
    expect(
      missingRequiredEnv({ ...withoutAppUrl, VERCEL_PROJECT_PRODUCTION_URL: "assay.example.com" }),
    ).toEqual([]);
  });
});

describe("missingEnvMessage", () => {
  it("names the variables and no values", () => {
    const message = missingEnvMessage(["MONGODB_URI", "APP_URL"]);
    expect(message).toContain("MONGODB_URI, APP_URL");
    expect(message).not.toContain("mongodb://");
  });
});

describe("disabledOptionalFeatures", () => {
  it("reports every optional feature when nothing is set", () => {
    expect(disabledOptionalFeatures({}).map((f) => f.feature)).toEqual([
      "sign-in providers",
      "alerts and data sources",
      "alert dispatch endpoint",
      "error tracking",
    ]);
  });

  it("needs one complete sign-in provider", () => {
    const off = (env: Record<string, string>) =>
      disabledOptionalFeatures(env).some((f) => f.feature === "sign-in providers");
    expect(off({ GITHUB_CLIENT_ID: "id" })).toBe(true);
    expect(off({ GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "secret" })).toBe(false);
    expect(off({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" })).toBe(false);
  });

  it("reports nothing when every feature is configured", () => {
    expect(
      disabledOptionalFeatures({
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "secret",
        ASSAY_SECRET_KEY: "key",
        CRON_SECRET: "cron",
        SENTRY_DSN: "https://key@example.ingest.sentry.io/1",
      }),
    ).toEqual([]);
  });
});
