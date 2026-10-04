import { apiKey } from "@better-auth/api-key";
import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { jwt, lastLoginMethod } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { ObjectId } from "mongodb";
import { mongoDatabaseName, sharedMongoClient } from "@/lib/database/mongo-connection";
import redis from "@/lib/cache/redis";
import { claimLegacyRole, emailAllowed } from "./legacy-accounts";
import { redisRateLimitStorage, upstashCounterStore } from "./rate-limit-storage";
import { enabledProviders } from "./providers";
import { prepareOAuthCollections, type AuthTable } from "./auth-collections";
import { cimdOptions } from "./cimd";
import { withNativeDefault } from "./mcp-clients";
import { refusedApiKeyUpdate } from "./api-key-update";
import { MCP_SCOPES, mcpResourceUrl } from "./mcp-scopes";
import { getUserRole, UserRole } from "./rbac";
import { COLLECTIONS } from "@/lib/database/collections";
import { logError } from "@/server/logging/log";
import { serverEnv } from "@/lib/config/env";

/**
 * Sign-in for Assay: Google and GitHub through Better Auth, with users,
 * sessions and linked accounts in the app's own MongoDB. No other service is
 * involved, so a self-hosted Assay needs only MongoDB and the OAuth apps.
 */

const building = serverEnv().NEXT_PHASE === "phase-production-build";

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
  const users = db.collection(COLLECTIONS.users);
  let doc = null;
  if (by.id && ObjectId.isValid(by.id)) doc = await users.findOne({ _id: new ObjectId(by.id) });
  if (!doc && by.email) {
    const email = by.email.trim().toLowerCase();
    doc = await users.findOne({ email });
  }
  return doc ? { id: String(doc._id), email: String(doc.email), name: String(doc.name ?? "") } : null;
}

// Once per instance, before the first auth request; retried if it failed.
let oauthCollections: Promise<void> | null = null;
const oauthCollectionsReady = (tables: Record<string, AuthTable>) =>
  (oauthCollections ??= prepareOAuthCollections(db, tables).catch((error) => {
    oauthCollections = null;
    logError("[Auth] Could not create the OAuth collections", { error: error });
  }));

const providers = enabledProviders();

export const auth = betterAuth({
  appName: "Assay",
  baseURL: serverEnv().BETTER_AUTH_URL || serverEnv().APP_URL,
  // `next build` imports this module without secrets; at runtime Better Auth
  // refuses to start without BETTER_AUTH_SECRET, and the proxy answers 503.
  secret: serverEnv().BETTER_AUTH_SECRET || (building ? "build-time-placeholder-never-used-for-sessions" : undefined),
  database: mongodbAdapter(db, { client }),
  socialProviders: {
    ...(providers.google && { google: { clientId: serverEnv().GOOGLE_CLIENT_ID!, clientSecret: serverEnv().GOOGLE_CLIENT_SECRET!, prompt: "select_account" } }),
    ...(providers.github && { github: { clientId: serverEnv().GITHUB_CLIENT_ID!, clientSecret: serverEnv().GITHUB_CLIENT_SECRET! } }),
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
  rateLimit: serverEnv().UPSTASH_REDIS_REST_URL
    ? { enabled: serverEnv().NODE_ENV === "production", customStorage: redisRateLimitStorage(upstashCounterStore(redis)) }
    : undefined,
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith("/oauth2/")) await oauthCollectionsReady(ctx.context.tables as Record<string, AuthTable>);
      if (ctx.path === "/oauth2/register" && ctx.body) return { context: { body: withNativeDefault(ctx.body) } };
      if (ctx.path === "/api-key/update") {
        const refused = refusedApiKeyUpdate(ctx.body);
        if (refused) throw new APIError("FORBIDDEN", { message: refused });
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!emailAllowed(user.email)) throw new APIError("FORBIDDEN", { message: "This email domain is not allowed" });
        },
        after: async (user) => {
          await claimLegacyRole(db, user).catch((error) => logError("[Auth] Could not link a legacy role", { error: error }));
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
    // OAuth for MCP clients that cannot take a pasted key (claude.ai
    // connectors, ChatGPT, …). Access tokens are JWTs signed with the keys
    // this plugin keeps, bound to the /api/mcp URL, and valid for an hour.
    jwt(),
    mcp({
      resource: mcpResourceUrl(),
      loginPage: "/sign-in",
      consentPage: "/oauth/consent",
      scopes: ["openid", "profile", "email", "offline_access", ...MCP_SCOPES],
      // Only people act through these clients: no client_credentials tokens.
      grantTypes: ["authorization_code", "refresh_token"],
      // MCP clients register themselves (RFC 7591) before sending anyone to
      // sign in. A client gets nothing until a person consents, and each
      // token carries at most that person's role.
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      // A client registers once per connection, so 3 per IP in 10 minutes is
      // plenty; the default 5 a minute lets anyone fill the consent page
      // with look-alike clients.
      rateLimit: { register: { window: 600, max: 3 } },
      // Creating, editing or listing clients by hand is for admins.
      clientPrivileges: async ({ user }) => Boolean(user && (await getUserRole(user.id)) === UserRole.ADMIN),
    }),
    // Clients that name themselves with a metadata URL instead of registering
    // (MCP 2026-07-28); see ./cimd.ts for how the fetch is kept safe.
    cimd(cimdOptions()),
    // Remembers the last provider in a cookie, so the sign-in page can mark it.
    lastLoginMethod(),
    nextCookies(),
  ],
});
