import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { MongoClient, ObjectId } from "mongodb";
import { claimLegacyRole, emailAllowed } from "./legacy-accounts";
import { enabledProviders } from "./providers";

/**
 * Sign-in for Assay: Google and GitHub through Better Auth, with users,
 * sessions and linked accounts in the app's own MongoDB. No other service is
 * involved, so a self-hosted Assay needs only MongoDB and the OAuth apps.
 */

const globalForAuth = globalThis as unknown as { authMongo?: MongoClient };

function mongo(): MongoClient {
  const uri = process.env.MONGODB_URI;
  // `next build` loads route modules to collect page data without secrets;
  // the driver connects lazily, so a placeholder is never dialled there.
  if (!uri && process.env.NEXT_PHASE === "phase-production-build") return new MongoClient("mongodb://build.invalid");
  if (!uri) throw new Error("MONGODB_URI is not set");
  // The driver connects lazily; one client per process, kept across dev reloads.
  globalForAuth.authMongo ??= new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 });
  return globalForAuth.authMongo;
}

const client = mongo();
const db = client.db(process.env.MONGODB_DB_NAME || "sql_script_monitoring");

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
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
