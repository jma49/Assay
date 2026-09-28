import type { Db } from "mongodb";
import { COLLECTIONS } from "@/lib/database/collections";

/**
 * Members who signed up through Clerk keep their role: the first time
 * someone signs in with a verified email that a role was given to, the role
 * moves to their new user id. The old id stays as legacyUserId for audit.
 * Unverified emails are never linked, or anyone could claim a role by
 * signing up with someone else's address.
 */
export async function claimLegacyRole(db: Db, user: { id: string; email: string; emailVerified: boolean }): Promise<boolean> {
  if (!user.emailVerified || !user.email) return false;
  const email = user.email.trim().toLowerCase();
  const roles = db.collection(COLLECTIONS.userRoles);
  const legacy = await roles.findOne({
    email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    userId: { $ne: user.id },
    legacyUserId: { $exists: false },
  });
  if (!legacy) return false;
  // The id changes on a unique index; a role already made for the new id wins.
  if (await roles.findOne({ userId: user.id })) return false;
  const result = await roles.updateOne({ _id: legacy._id, userId: legacy.userId }, { $set: { userId: user.id, legacyUserId: legacy.userId, updatedAt: new Date() } });
  return result.modifiedCount === 1;
}

/** Whether the email may sign in, per ALLOWED_EMAIL_DOMAINS (empty allows everyone). */
export function emailAllowed(email: string, env: Record<string, string | undefined> = process.env): boolean {
  const domains = (env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (domains.length === 0) return true;
  const at = email.toLowerCase().lastIndexOf("@");
  return at > 0 && domains.includes(email.slice(at + 1).toLowerCase());
}
