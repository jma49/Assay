import { NextRequest, NextResponse } from "next/server";
import { findUser } from "@/lib/auth/server";
import { validateApiAuth } from "@/lib/auth/auth-utils";
import {
  UserRole,
  Permission,
  getAllUserRoles,
  setUserRole,
  removeUserRole,
  requirePermission,
  canManageRole,
  getUserRole,
} from "@/lib/auth/rbac";

interface SetUserRoleRequest {
  /** Who gets the role: their user id, or the email they signed up with. */
  targetUserId?: string;
  targetEmail?: string;
  role: UserRole;
}

/**
 * GET: every active member and their role.
 */
export async function GET() {
  try {
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user } = authResult;

    // Admins (user:manage) and managers (user:role:assign) may read the list.
    const permissionCheck = await requirePermission(
      user.id,
      Permission.USER_MANAGE
    );

    if (!permissionCheck.authorized) {
      const roleAssignCheck = await requirePermission(
        user.id,
        Permission.USER_ROLE_ASSIGN
      );

      if (!roleAssignCheck.authorized) {
        return NextResponse.json(
          { success: false, message: "权限不足：无法查看用户角色" },
          { status: 403 }
        );
      }
    }

    const userRoles = await getAllUserRoles();

    return NextResponse.json({
      success: true,
      data: userRoles,
      count: userRoles.length,
    });
  } catch (error) {
    console.error("[API] 获取用户角色列表失败:", error);
    return NextResponse.json(
      { success: false, message: "获取用户角色列表时发生错误" },
      { status: 500 }
    );
  }
}

/**
 * POST: gives a signed-up person a role.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user, userEmail } = authResult;

    const permissionCheck = await requirePermission(
      user.id,
      Permission.USER_ROLE_ASSIGN
    );

    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { success: false, message: "权限不足：无法分配用户角色" },
        { status: 403 }
      );
    }

    const body: SetUserRoleRequest = await request.json();
    const { role } = body;

    if ((!body.targetUserId && !body.targetEmail) || !role) {
      return NextResponse.json(
        {
          success: false,
          message: "缺少必要参数：targetUserId 或 targetEmail, role",
        },
        { status: 400 }
      );
    }

    // The person must have signed up; their id and email come from the user store.
    const target = await findUser({ id: body.targetUserId, email: body.targetEmail });
    if (!target) {
      return NextResponse.json(
        { success: false, message: "目标用户不存在：请先让对方登录一次" },
        { status: 404 }
      );
    }
    const targetUserId = target.id;

    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { success: false, message: "无效的角色类型" },
        { status: 400 }
      );
    }

    const currentUserRole = permissionCheck.userRole;
    if (!currentUserRole) {
      return NextResponse.json(
        { success: false, message: "无法获取当前用户角色" },
        { status: 403 }
      );
    }

    if (!canManageRole(currentUserRole, role)) {
      return NextResponse.json(
        {
          success: false,
          message: `权限不足：${currentUserRole} 角色无法分配 ${role} 角色`,
        },
        { status: 403 }
      );
    }

    // The caller must also be allowed to manage the role the target holds
    // now, or a manager could demote an admin by "assigning" them viewer.
    const existingRole = await getUserRole(targetUserId);
    if (existingRole && !canManageRole(currentUserRole, existingRole)) {
      return NextResponse.json(
        {
          success: false,
          message: `权限不足：${currentUserRole} 角色无法修改 ${existingRole} 用户的角色`,
        },
        { status: 403 }
      );
    }

    const targetEmail = target.email;

    // Only admins may change their own role.
    if (targetUserId === user.id && currentUserRole !== UserRole.ADMIN) {
      return NextResponse.json(
        { success: false, message: "不能修改自己的角色" },
        { status: 403 }
      );
    }

    const success = await setUserRole(
      targetUserId,
      targetEmail,
      role,
      userEmail
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: `用户 ${targetEmail} 的角色已设置为 ${role}`,
        data: { targetUserId, targetEmail, role },
      });
    } else {
      return NextResponse.json(
        { success: false, message: "设置用户角色失败" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[API] 设置用户角色失败:", error);
    return NextResponse.json(
      { success: false, message: "设置用户角色时发生错误" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: removes someone's role. Admins only.
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user } = authResult;

    const permissionCheck = await requirePermission(
      user.id,
      Permission.USER_MANAGE
    );

    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { success: false, message: "权限不足：只有管理员可以删除用户角色" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, message: "缺少参数：userId" },
        { status: 400 }
      );
    }

    // Nobody removes their own role.
    if (targetUserId === user.id) {
      return NextResponse.json(
        { success: false, message: "不能删除自己的角色" },
        { status: 403 }
      );
    }

    const success = await removeUserRole(targetUserId);

    if (success) {
      return NextResponse.json({
        success: true,
        message: "用户角色已删除",
        data: { targetUserId },
      });
    } else {
      return NextResponse.json(
        { success: false, message: "删除用户角色失败或用户不存在" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("[API] 删除用户角色失败:", error);
    return NextResponse.json(
      { success: false, message: "删除用户角色时发生错误" },
      { status: 500 }
    );
  }
}
