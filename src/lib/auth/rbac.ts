import mongoDbClient from "../database/mongodb";
import { Collection, Document } from "mongodb";

// 定义系统角色枚举
export enum UserRole {
  ADMIN = "admin", // 系统管理员 - 所有权限
  MANAGER = "manager", // 项目经理 - 管理脚本和审批
  DEVELOPER = "developer", // 开发者 - 创建和编辑脚本
  VIEWER = "viewer", // 查看者 - 只读访问
}

// 定义权限枚举
export enum Permission {
  // 脚本相关权限
  SCRIPT_CREATE = "script:create",
  SCRIPT_READ = "script:read",
  SCRIPT_UPDATE = "script:update",
  SCRIPT_DELETE = "script:delete",
  SCRIPT_EXECUTE = "script:execute",
  SCRIPT_APPROVE = "script:approve",
  SCRIPT_REJECT = "script:reject",

  // 历史记录权限
  HISTORY_READ = "history:read",
  HISTORY_DELETE = "history:delete",

  // 用户管理权限
  USER_MANAGE = "user:manage",
  USER_ROLE_ASSIGN = "user:role:assign",

  // 系统管理权限
  SYSTEM_MANAGE = "system:manage",
  CACHE_MANAGE = "cache:manage",
}

// 角色权限映射
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // 管理员拥有所有权限
    Permission.SCRIPT_CREATE,
    Permission.SCRIPT_READ,
    Permission.SCRIPT_UPDATE,
    Permission.SCRIPT_DELETE,
    Permission.SCRIPT_EXECUTE,
    Permission.SCRIPT_APPROVE,
    Permission.SCRIPT_REJECT,
    Permission.HISTORY_READ,
    Permission.HISTORY_DELETE,
    Permission.USER_MANAGE,
    Permission.USER_ROLE_ASSIGN,
    Permission.SYSTEM_MANAGE,
    Permission.CACHE_MANAGE,
  ],
  [UserRole.MANAGER]: [
    // 项目经理权限
    Permission.SCRIPT_CREATE,
    Permission.SCRIPT_READ,
    Permission.SCRIPT_UPDATE,
    Permission.SCRIPT_DELETE,
    Permission.SCRIPT_EXECUTE,
    Permission.SCRIPT_APPROVE,
    Permission.SCRIPT_REJECT,
    Permission.HISTORY_READ,
    Permission.USER_ROLE_ASSIGN, // 可以分配开发者和查看者角色
  ],
  [UserRole.DEVELOPER]: [
    // 开发者权限
    Permission.SCRIPT_CREATE,
    Permission.SCRIPT_READ,
    Permission.SCRIPT_UPDATE,
    Permission.SCRIPT_EXECUTE,
    Permission.HISTORY_READ,
  ],
  [UserRole.VIEWER]: [
    // 查看者权限
    Permission.SCRIPT_READ,
    Permission.HISTORY_READ,
  ],
};

// 用户角色数据接口
export interface UserRoleInfo {
  userId: string;
  email: string;
  role: UserRole;
  assignedBy: string;
  assignedAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// 获取用户角色集合
async function getUserRolesCollection(): Promise<Collection<Document>> {
  const db = await mongoDbClient.getDb();
  return db.collection("user_roles");
}

/**
 * 获取用户角色
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const collection = await getUserRolesCollection();
    const userRole = await collection.findOne(
      { userId, isActive: true },
      { projection: { role: 1 } }
    );

    return userRole ? (userRole.role as UserRole) : null;
  } catch (error) {
    console.error("[RBAC] 获取用户角色失败:", error);
    return null;
  }
}

/**
 * 设置用户角色
 */
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

    // 使用 upsert 来更新或创建用户角色
    const result = await collection.replaceOne({ userId }, userRoleData, {
      upsert: true,
    });

    console.log(`[RBAC] 用户 ${email} 的角色已设置为 ${role}`);
    return result.acknowledged;
  } catch (error) {
    console.error("[RBAC] 设置用户角色失败:", error);
    return false;
  }
}

/**
 * 检查用户是否拥有特定权限
 */
export async function hasPermission(
  userId: string,
  permission: Permission
): Promise<boolean> {
  try {
    const userRole = await getUserRole(userId);
    if (!userRole) {
      return false;
    }

    const rolePermissions = ROLE_PERMISSIONS[userRole];
    return rolePermissions.includes(permission);
  } catch (error) {
    console.error("[RBAC] 权限检查失败:", error);
    return false;
  }
}

/**
 * 检查用户是否拥有多个权限中的任意一个
 */
export async function hasAnyPermission(
  userId: string,
  permissions: Permission[]
): Promise<boolean> {
  try {
    const userRole = await getUserRole(userId);
    if (!userRole) {
      return false;
    }

    const rolePermissions = ROLE_PERMISSIONS[userRole];
    return permissions.some((permission) =>
      rolePermissions.includes(permission)
    );
  } catch (error) {
    console.error("[RBAC] 权限检查失败:", error);
    return false;
  }
}

/**
 * 检查用户是否拥有所有指定权限
 */
export async function hasAllPermissions(
  userId: string,
  permissions: Permission[]
): Promise<boolean> {
  try {
    const userRole = await getUserRole(userId);
    if (!userRole) {
      return false;
    }

    const rolePermissions = ROLE_PERMISSIONS[userRole];
    return permissions.every((permission) =>
      rolePermissions.includes(permission)
    );
  } catch (error) {
    console.error("[RBAC] 权限检查失败:", error);
    return false;
  }
}

/**
 * 获取用户的所有权限
 */
export async function getUserPermissions(
  userId: string
): Promise<Permission[]> {
  try {
    const userRole = await getUserRole(userId);
    if (!userRole) {
      return [];
    }

    return ROLE_PERMISSIONS[userRole];
  } catch (error) {
    console.error("[RBAC] 获取用户权限失败:", error);
    return [];
  }
}

/**
 * 获取所有用户角色信息
 */
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
    console.error("[RBAC] 获取所有用户角色失败:", error);
    return [];
  }
}

/**
 * 删除用户角色（将 isActive 设为 false）
 */
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

    return result.modifiedCount > 0;
  } catch (error) {
    console.error("[RBAC] 删除用户角色失败:", error);
    return false;
  }
}

/**
 * 检查角色是否可以管理目标角色
 */
export function canManageRole(
  managerRole: UserRole,
  targetRole: UserRole
): boolean {
  if (managerRole === UserRole.ADMIN) {
    return true; // 管理员可以管理所有角色
  }

  if (managerRole === UserRole.MANAGER) {
    // 项目经理可以管理开发者和查看者，但不能管理其他经理或管理员
    return targetRole === UserRole.DEVELOPER || targetRole === UserRole.VIEWER;
  }

  return false; // 其他角色不能管理角色
}

/**
 * 权限中间件：验证用户是否有权限执行操作
 */
export async function requirePermission(
  userId: string,
  permission: Permission
): Promise<{ authorized: boolean; userRole?: UserRole }> {
  const userRole = await getUserRole(userId);

  if (!userRole) {
    return { authorized: false };
  }

  const authorized = await hasPermission(userId, permission);

  return { authorized, userRole };
}
