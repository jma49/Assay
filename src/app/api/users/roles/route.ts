import { NextRequest, NextResponse } from "next/server";
import { validateApiAuth } from "@/lib/auth/auth-utils";
import {
  UserRole,
  Permission,
  getAllUserRoles,
  setUserRole,
  removeUserRole,
  requirePermission,
  canManageRole,
} from "@/lib/auth/rbac";

// 设置角色的请求体接口
interface SetUserRoleRequest {
  targetUserId: string;
  targetEmail: string;
  role: UserRole;
}

/**
 * GET - 获取所有用户角色信息
 */
export async function GET() {
  try {
    // 验证用户认证
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user } = authResult;

    // 检查权限：需要 USER_MANAGE 或 USER_ROLE_ASSIGN 权限
    const permissionCheck = await requirePermission(
      user.id,
      Permission.USER_MANAGE
    );

    if (!permissionCheck.authorized) {
      // 如果没有 USER_MANAGE 权限，检查是否有 USER_ROLE_ASSIGN 权限
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

    // 获取所有用户角色
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
 * POST - 设置用户角色
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户认证
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user, userEmail } = authResult;

    // 检查权限：需要 USER_ROLE_ASSIGN 权限
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

    // 解析请求体
    const body: SetUserRoleRequest = await request.json();
    const { targetUserId, targetEmail, role } = body;

    // 验证请求参数
    if (!targetUserId || !targetEmail || !role) {
      return NextResponse.json(
        {
          success: false,
          message: "缺少必要参数：targetUserId, targetEmail, role",
        },
        { status: 400 }
      );
    }

    // 验证角色是否有效
    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { success: false, message: "无效的角色类型" },
        { status: 400 }
      );
    }

    // 获取当前用户的角色
    const currentUserRole = permissionCheck.userRole;
    if (!currentUserRole) {
      return NextResponse.json(
        { success: false, message: "无法获取当前用户角色" },
        { status: 403 }
      );
    }

    // 检查是否可以管理目标角色
    if (!canManageRole(currentUserRole, role)) {
      return NextResponse.json(
        {
          success: false,
          message: `权限不足：${currentUserRole} 角色无法分配 ${role} 角色`,
        },
        { status: 403 }
      );
    }

    // 防止用户修改自己的角色（除非是管理员）
    if (targetUserId === user.id && currentUserRole !== UserRole.ADMIN) {
      return NextResponse.json(
        { success: false, message: "不能修改自己的角色" },
        { status: 403 }
      );
    }

    // 设置用户角色
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
 * DELETE - 删除用户角色
 */
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户认证
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user } = authResult;

    // 检查权限：需要 USER_MANAGE 权限（只有管理员可以删除角色）
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

    // 获取要删除的用户ID
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, message: "缺少参数：userId" },
        { status: 400 }
      );
    }

    // 防止删除自己的角色
    if (targetUserId === user.id) {
      return NextResponse.json(
        { success: false, message: "不能删除自己的角色" },
        { status: 403 }
      );
    }

    // 删除用户角色
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
