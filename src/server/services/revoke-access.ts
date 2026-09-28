import { ObjectId, type Db } from "mongodb";
import { COLLECTIONS } from "@/lib/database/collections";

/**
 * Matches a user reference in Better Auth's collections. Its MongoDB adapter
 * stores fields that reference the user (session.userId, oauthConsent.userId,
 * …) as ObjectIds, so a plain string never matches them; the string form is
 * kept for rows written by other means.
 */
export const userRef = (userId: string) => (ObjectId.isValid(userId) ? { $in: [userId, new ObjectId(userId)] } : userId);

/**
 * Signs someone out everywhere, deletes their API keys and disconnects
 * their OAuth apps (MCP clients), for when their role is removed. Keys are
 * deleted, not disabled, so nothing can switch them back on. Sign-up is
 * public, so signing in again makes them a viewer; what this takes away is
 * the access they already held. The session cookie cache can keep a browser
 * signed in for up to its five-minute lifetime.
 */
export async function revokeAccess(db: Db, userId: string): Promise<{ sessions: number; apiKeys: number; oauthApps: number }> {
  const user = userRef(userId);
  const [sessions, apiKeys, consents] = await Promise.all([
    db.collection(COLLECTIONS.sessions).deleteMany({ userId: user }),
    // The API key plugin stores referenceId as a string.
    db.collection(COLLECTIONS.apiKeys).deleteMany({ referenceId: userId }),
    // Without a consent the MCP route refuses the app's access tokens at once,
    // and without refresh tokens it cannot get new ones.
    db.collection(COLLECTIONS.oauthConsents).deleteMany({ userId: user }),
    db.collection(COLLECTIONS.oauthRefreshTokens).deleteMany({ userId: user }),
  ]);
  return { sessions: sessions.deletedCount, apiKeys: apiKeys.deletedCount, oauthApps: consents.deletedCount };
}
