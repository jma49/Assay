import { getMongoDbClient } from "../database/mongodb";
import { Collection, Document } from "mongodb";
import { TtlCache } from "../cache/ttl-cache";
import { COLLECTIONS } from "@/lib/database/collections";

// Every API request checks the caller's role, and a MongoDB round trip costs
// ~70ms. Changes made on this instance invalidate immediately; other
// instances see a role change within ROLE_CACHE_TTL_MS.
const ROLE_CACHE_TTL_MS = 30_000;
const roleCache = new TtlCache<UserRole | null>(ROLE_CACHE_TTL_MS);

export enum UserRole {
  /** Everything, including members and system settings. */
  ADMIN = "admin",
  /** Checks and approvals; may give the developer and viewer roles. */
  MANAGER = "manager",
  /** Writes and runs checks; changes need approval. */
  DEVELOPER = "developer",
  /** Reads checks and their history. */
  VIEWER = "viewer",
}

export enum Permission {
  CHECK_CREATE = "check:create",
  CHECK_READ = "check:read",
  CHECK_UPDATE = "check:update",
  CHECK_DELETE = "check:delete",
  CHECK_EXECUTE = "check:execute",
  CHECK_APPROVE = "check:approve",
  CHECK_REJECT = "check:reject",

  HISTORY_READ = "history:read",
  HISTORY_DELETE = "history:delete",

  USER_MANAGE = "user:manage",
  USER_ROLE_ASSIGN = "user:role:assign",

  SYSTEM_MANAGE = "system:manage",
  NOTIFICATION_MANAGE = "notification:manage",
  CACHE_MANAGE = "cache:manage",
  /** Add, edit and delete data sources (their connection strings reach any database). */
  DATASOURCE_MANAGE = "datasource:manage",
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.CHECK_CREATE,
    Permission.CHECK_READ,
    Permission.CHECK_UPDATE,
    Permission.CHECK_DELETE,
    Permission.CHECK_EXECUTE,
    Permission.CHECK_APPROVE,
    Permission.CHECK_REJECT,
    Permission.HISTORY_READ,
    Permission.HISTORY_DELETE,
    Permission.USER_MANAGE,
    Permission.USER_ROLE_ASSIGN,
    Permission.SYSTEM_MANAGE,
    Permission.NOTIFICATION_MANAGE,
    Permission.CACHE_MANAGE,
    Permission.DATASOURCE_MANAGE,
  ],
  [UserRole.MANAGER]: [
    Permission.CHECK_CREATE,
    Permission.CHECK_READ,
    Permission.CHECK_UPDATE,
    Permission.CHECK_DELETE,
    Permission.CHECK_EXECUTE,
    Permission.CHECK_APPROVE,
    Permission.CHECK_REJECT,
    Permission.HISTORY_READ,
    Permission.USER_ROLE_ASSIGN, // developer and viewer only; see canManageRole
    Permission.NOTIFICATION_MANAGE,
  ],
  [UserRole.DEVELOPER]: [
    Permission.CHECK_CREATE,
    Permission.CHECK_READ,
    Permission.CHECK_UPDATE,
    Permission.CHECK_EXECUTE,
    Permission.HISTORY_READ,
  ],
  [UserRole.VIEWER]: [
    Permission.CHECK_READ,
    Permission.HISTORY_READ,
  ],
};

export interface UserRoleInfo {
  userId: string;
  email: string;
  role: UserRole;
  assignedBy: string;
  assignedAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

async function getUserRolesCollection(): Promise<Collection<Document>> {
  const mongoDbClient = getMongoDbClient();
  const db = await mongoDbClient.getDb();
  return db.collection(COLLECTIONS.userRoles);
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const cached = roleCache.get(userId);
  if (cached !== undefined) return cached;

  try {
    const collection = await getUserRolesCollection();
    const userRole = await collection.findOne(
      { userId, isActive: true },
      { projection: { role: 1 } }
    );

    const role = userRole ? (userRole.role as UserRole) : null;
    roleCache.set(userId, role);
    return role;
  } catch (error) {
    console.error("[RBAC] Reading a role failed:", error);
    return null;
  }
}

const DUPLICATE_KEY = 11000;

/**
 * Gives a signed-in user the default viewer role unless they hold an active
 * one. It never replaces an active role, so a failed read (which looks like
 * "no role") cannot demote an admin: the filter skips active documents and
 * the unique userId index turns the upsert into a no-op.
 */
export async function ensureDefaultRole(userId: string, email: string): Promise<void> {
  const collection = await getUserRolesCollection();
  const now = new Date();
  try {
    await collection.updateOne(
      { userId, isActive: { $ne: true } },
      { $set: { userId, email, role: UserRole.VIEWER, assignedBy: "system", assignedAt: now, updatedAt: now, isActive: true } },
      { upsert: true },
    );
    roleCache.delete(userId);
  } catch (error) {
    if ((error as { code?: number }).code !== DUPLICATE_KEY) throw error;
  }
}

/** Gives someone a role, replacing any they had. */
export async function setUserRole(
  userId: string,
  email: string,
  role: UserRole,
  assignedBy: string
): Promise<boolean> {
  try {
    const collection = await getUserRolesCollection();

    const now = new Date();
    const userRoleData: UserRoleInfo = {
      userId,
      email,
      role,
      assignedBy,
      assignedAt: now,
      updatedAt: now,
      isActive: true,
    };

    const result = await collection.replaceOne({ userId }, userRoleData, {
      upsert: true,
    });
    roleCache.delete(userId);

    console.log(`[RBAC] ${email} is now ${role}`);
    return result.acknowledged;
  } catch (error) {
    console.error("[RBAC] Setting a role failed:", error);
    return false;
  }
}

export async function getAllUserRoles(): Promise<UserRoleInfo[]> {
  try {
    const collection = await getUserRolesCollection();
    const userRoles = await collection
      .find({ isActive: true })
      .sort({ updatedAt: -1 })
      .toArray();

    return userRoles.map((doc) => ({
      userId: doc.userId,
      email: doc.email,
      role: doc.role as UserRole,
      assignedBy: doc.assignedBy,
      assignedAt: doc.assignedAt,
      updatedAt: doc.updatedAt,
      isActive: doc.isActive,
    }));
  } catch (error) {
    console.error("[RBAC] Listing roles failed:", error);
    return [];
  }
}

/** Removes someone's role; the record stays, marked inactive. */
export async function removeUserRole(userId: string): Promise<boolean> {
  try {
    const collection = await getUserRolesCollection();
    const result = await collection.updateOne(
      { userId },
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
        },
      }
    );
    roleCache.delete(userId);

    return result.modifiedCount > 0;
  } catch (error) {
    console.error("[RBAC] Removing a role failed:", error);
    return false;
  }
}

/** Whether an active admin other than `userId` exists, so changing `userId` still leaves someone who can manage roles. */
export async function hasOtherActiveAdmin(userId: string): Promise<boolean> {
  const collection = await getUserRolesCollection();
  const others = await collection.countDocuments({ role: UserRole.ADMIN, isActive: true, userId: { $ne: userId } }, { limit: 1 });
  return others > 0;
}

/** Whether a role may give or take away another: admins any, managers developer and viewer only. */
export function canManageRole(
  managerRole: UserRole,
  targetRole: UserRole
): boolean {
  if (managerRole === UserRole.ADMIN) {
    return true;
  }

  if (managerRole === UserRole.MANAGER) {
    return targetRole === UserRole.DEVELOPER || targetRole === UserRole.VIEWER;
  }

  return false;
}

/** Whether the user's role has the permission, and which role it is. */
export async function requirePermission(
  userId: string,
  permission: Permission
): Promise<{ authorized: boolean; userRole?: UserRole }> {
  const userRole = await getUserRole(userId);

  if (!userRole) {
    return { authorized: false };
  }

  return { authorized: ROLE_PERMISSIONS[userRole].includes(permission), userRole };
}
