import { NextRequest, NextResponse } from "next/server";
import { validateApiAuth } from "@/lib/auth-utils";
import { Permission, requirePermission } from "@/lib/rbac";
import {
  getPendingApprovals,
  approveScript,
  rejectScript,
  getApprovalHistory,
} from "@/lib/approval-workflow";

/**
 * GET - 获取待审批列表或审批历史
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户认证
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user, userEmail } = authResult;
    const { searchParams } = new URL(request.url);

    // 检查权限：需要 SCRIPT_APPROVE 或 SCRIPT_REJECT 权限才能查看审批列表
    const hasApprovalPermission = await requirePermission(
      user.id,
      Permission.SCRIPT_APPROVE
    );
    const hasRejectPermission = await requirePermission(
      user.id,
      Permission.SCRIPT_REJECT
    );

    if (!hasApprovalPermission.authorized && !hasRejectPermission.authorized) {
      return NextResponse.json(
        { success: false, message: "权限不足：无法查看审批列表" },
        { status: 403 }
      );
    }

    const action = searchParams.get("action") || "pending"; // pending, history

    if (action === "history") {
      // 获取审批历史
      const scriptId = searchParams.get("scriptId") || undefined;
      const requestId = searchParams.get("requestId") || undefined;

      const history = await getApprovalHistory(scriptId, requestId);

      return NextResponse.json({
        success: true,
        action: "history",
        data: history,
        count: history.length,
      });
    } else {
      // 获取待审批列表
      const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
      const limit = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get("limit") || "20"))
      );

      const result = await getPendingApprovals(user.id, page, limit);

      return NextResponse.json({
        success: true,
        action: "pending",
        data: result.data,
        pagination: result.pagination,
        user_info: {
          userId: user.id,
          email: userEmail,
          canApprove: hasApprovalPermission.authorized,
          canReject: hasRejectPermission.authorized,
        },
      });
    }
  } catch (error) {
    console.error("[API] 获取审批信息失败:", error);
    return NextResponse.json(
      { success: false, message: "获取审批信息时发生错误" },
      { status: 500 }
    );
  }
}

/**
 * POST - 审批或拒绝脚本
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户认证
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user, userEmail } = authResult;

    // 解析请求体
    const body = await request.json();
    const { requestId, action, comment } = body;

    // 验证请求参数
    if (!requestId || !action) {
      return NextResponse.json(
        { success: false, message: "缺少必要参数：requestId, action" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "无效的操作类型，只支持 approve 或 reject" },
        { status: 400 }
      );
    }

    if (action === "reject" && !comment) {
      return NextResponse.json(
        { success: false, message: "拒绝操作必须提供拒绝理由" },
        { status: 400 }
      );
    }

    let result: { success: boolean; message: string };

    if (action === "approve") {
      // 检查审批权限
      const permissionCheck = await requirePermission(
        user.id,
        Permission.SCRIPT_APPROVE
      );
      if (!permissionCheck.authorized) {
        return NextResponse.json(
          { success: false, message: "权限不足：无审批权限" },
          { status: 403 }
        );
      }

      result = await approveScript(requestId, user.id, userEmail, comment);
    } else {
      // 检查拒绝权限
      const permissionCheck = await requirePermission(
        user.id,
        Permission.SCRIPT_REJECT
      );
      if (!permissionCheck.authorized) {
        return NextResponse.json(
          { success: false, message: "权限不足：无拒绝权限" },
          { status: 403 }
        );
      }

      result = await rejectScript(requestId, user.id, userEmail, comment);
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          requestId,
          action,
          reviewedBy: userEmail,
          reviewedAt: new Date(),
          comment,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[API] 处理审批操作失败:", error);
    return NextResponse.json(
      { success: false, message: "处理审批操作时发生错误" },
      { status: 500 }
    );
  }
}
