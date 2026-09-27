import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { lastLoginMethod } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { ObjectId } from "mongodb";
import { mongoDatabaseName, sharedMongoClient } from "@/lib/database/mongo-connection";
import redis from "@/lib/cache/redis";
import { claimLegacyRole, emailAllowed } from "./legacy-accounts";
import { redisRateLimitStorage, upstashCounterStore } from "./rate-limit-storage";
import { enabledProviders } from "./providers";

/**
 * Sign-in for Assay: Google and GitHub through Better Auth, with users,
 * sessions and linked accounts in the app's own MongoDB. No other service is
 * involved, so a self-hosted Assay needs only MongoDB and the OAuth apps.
 */

const building = process.env.NEXT_PHASE === "phase-production-build";

// The same client and database as the rest of the app: users, sessions and
// roles must live together, or roles never find their users.
const client = sharedMongoClient();
const db = client.db(mongoDatabaseName());

/**
 * A signed-up user by id or email, from the users Better Auth keeps. Admins
 * assign roles through it, so the email always comes from here, never from
 * the request.
 */
export async function findUser(by: { id?: string; email?: string }): Promise<{ id: string; email: string; name: string } | null> {
  const users = db.collection("user");
  let doc = null;
  if (by.id && ObjectId.isValid(by.id)) doc = await users.findOne({ _id: new ObjectId(by.id) });
  if (!doc && by.email) {
    const email = by.email.trim().toLowerCase();
    doc = await users.findOne({ email });
  }
  return doc ? { id: String(doc._id), email: String(doc.email), name: String(doc.name ?? "") } : null;
}

const providers = enabledProviders();

export const auth = betterAuth({
  appName: "Assay",
  baseURL: process.env.BETTER_AUTH_URL || process.env.APP_URL,
  // `next build` imports this module without secrets; at runtime Better Auth
  // refuses to start without BETTER_AUTH_SECRET, and the middleware answers 503.
  secret: process.env.BETTER_AUTH_SECRET || (building ? "build-time-placeholder-never-used-for-sessions" : undefined),
  database: mongodbAdapter(db, { client }),
  socialProviders: {
    ...(providers.google && { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!, prompt: "select_account" } }),
    ...(providers.github && { github: { clientId: process.env.GITHUB_CLIENT_ID!, clientSecret: process.env.GITHUB_CLIENT_SECRET! } }),
  },
  emailAndPassword: { enabled: providers.password },
  account: {
    // The same person signing in with Google and GitHub becomes one user,
    // but only when the provider says the email is verified. No provider is
    // "trusted" past that check, or an unverified address could take over
    // someone else's account.
    accountLinking: { enabled: true },
  },
  session: {
    // A signed cookie holds the session for five minutes, so most API calls
    // skip the database round trip; revocation takes effect within that time.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  telemetry: { enabled: false },
  // Counts shared by every instance through Redis when it is configured;
  // otherwise Better Auth's per-instance memory counts.
  rateLimit: process.env.UPSTASH_REDIS_REST_URL
    ? { enabled: process.env.NODE_ENV === "production", customStorage: redisRateLimitStorage(upstashCounterStore(redis)) }
    : undefined,
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!emailAllowed(user.email)) throw new APIError("FORBIDDEN", { message: "This email domain is not allowed" });
        },
        after: async (user) => {
          await claimLegacyRole(db, user).catch((error) => console.error("[Auth] Could not link a legacy role:", error));
        },
      },
    },
  },
  plugins: [
    // Personal API keys for agents (the MCP server). Only a hash is stored;
    // the default of 10 requests a day would stop an agent mid-task.
    apiKey({
      defaultPrefix: "assay_",
      // "assay_" plus four characters, so people can tell their keys apart.
      startingCharactersConfig: { charactersLength: 10 },
      rateLimit: { enabled: true, timeWindow: 60_000, maxRequests: 120 },
      // In seconds, although the plugin's type comment says milliseconds.
      keyExpiration: { defaultExpiresIn: 90 * 24 * 60 * 60, maxExpiresIn: 365 },
    }),
    // Remembers the last provider in a cookie, so the sign-in page can mark it.
    lastLoginMethod(),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
