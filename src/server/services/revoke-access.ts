import { ObjectId, type Db } from "mongodb";
import { COLLECTIONS } from "@/lib/database/collections";

/**
 * Matches a user reference in Better Auth's collections. Its MongoDB adapter
 * stores fields that reference the user (session.userId, …) as ObjectIds, so
 * a plain string never matches them; the string form is kept for rows
 * written by other means.
 */
export const userRef = (userId: string) => (ObjectId.isValid(userId) ? { $in: [userId, new ObjectId(userId)] } : userId);

/**
 * Signs someone out everywhere and disables their API keys, for when their
 * role is removed. Sign-up is public, so signing in again makes them a viewer;
 * what this takes away is the access they already held. The session cookie
 * cache can keep a browser signed in for up to its five-minute lifetime.
 */
export async function revokeAccess(db: Db, userId: string, now = new Date()): Promise<{ sessions: number; apiKeys: number }> {
  const [sessions, apiKeys] = await Promise.all([
    db.collection(COLLECTIONS.sessions).deleteMany({ userId: userRef(userId) }),
    db.collection(COLLECTIONS.apiKeys).updateMany({ referenceId: userId, enabled: { $ne: false } }, { $set: { enabled: false, updatedAt: now } }),
  ]);
  return { sessions: sessions.deletedCount, apiKeys: apiKeys.modifiedCount };
}
