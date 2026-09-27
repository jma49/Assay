import { intParam } from "@/lib/utils/query-params";
import { NextResponse } from "next/server";
import { withAuth } from "@/server/http/route";
import { Permission, requirePermission } from "@/lib/auth/rbac";
import {
  getPendingApprovals,
  approveScript,
  rejectScript,
  getCompletedApprovals,
} from "@/lib/workflows/approval-workflow";

const REVIEWERS = { anyOf: [Permission.SCRIPT_APPROVE, Permission.SCRIPT_REJECT] };

/**
 * GET: pending requests, or decided ones for the history view.
 */
export const GET = withAuth(REVIEWERS, async (request, { principal }) => {
  try {
    const userEmail = principal.email;
    const { searchParams } = new URL(request.url);

    // What the reviewer may do with each request.
    const hasApprovalPermission = await requirePermission(principal.id, Permission.SCRIPT_APPROVE);
    const hasRejectPermission = await requirePermission(principal.id, Permission.SCRIPT_REJECT);

    const action = searchParams.get("action") === "history" ? "history" : "pending";

    if (action === "history") {
      const page = intParam(searchParams.get("page"), 1, 1, 10_000);
      const limit = intParam(searchParams.get("limit"), 20, 1, 100);

      const result = await getCompletedApprovals(page, limit);

      const transformedHistoryData = result.data.map((request) => ({
        id: request.requestId,
        scriptId: request.scriptId,
        scriptName: request.title || `脚本 ${request.scriptId}`,
        scriptType: request.scriptType,
        status: request.status,
        requesterEmail: request.requesterEmail,
        requesterId: request.requesterId,
        createdAt: request.requestedAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
        requiredApprovers: request.requiredApprovers,
        currentApprovers: request.reviewedBy
          ? [
              {
                userId: request.reviewedBy,
                email: request.reviewerEmail || "unknown",
                role: "reviewer",
                decision:
                  request.status === "approved"
                    ? ("approved" as const)
                    : ("rejected" as const),
                comment: request.reviewComment,
                timestamp:
                  request.reviewedAt?.toISOString() || new Date().toISOString(),
              },
            ]
          : [],
        isComplete: true,
        comment: request.reviewComment,
        reason: request.description,
      }));

      return NextResponse.json({
        success: true,
        action: "history",
        data: transformedHistoryData,
        pagination: result.pagination,
        count: transformedHistoryData.length,
      });
    } else {
      const page = intParam(searchParams.get("page"), 1, 1, 10_000);
      const limit = intParam(searchParams.get("limit"), 20, 1, 100);

      const result = await getPendingApprovals(principal.id, page, limit);

      const transformedData = result.data.map((request) => ({
        id: request.requestId,
        scriptId: request.scriptId,
        scriptName: request.title || `脚本 ${request.scriptId}`,
        scriptType: request.scriptType,
        status: request.status,
        requesterEmail: request.requesterEmail,
        requesterId: request.requesterId,
        createdAt: request.requestedAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
        requiredApprovers: request.requiredApprovers,
        currentApprovers: (request.currentApprovers || []).map((approver) => ({
          userId: request.reviewedBy || approver,
          email: request.reviewerEmail || "unknown",
          role: "reviewer",
          decision:
            request.status === "approved"
              ? ("approved" as const)
              : ("rejected" as const),
          comment: request.reviewComment,
          timestamp:
            request.reviewedAt?.toISOString() || new Date().toISOString(),
        })),
        isComplete: request.status !== "pending",
        comment: request.reviewComment,
        reason: request.description,
      }));

      return NextResponse.json({
        success: true,
        action: "pending",
        data: transformedData,
        pagination: result.pagination,
        user_info: {
          userId: principal.id,
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
});

/**
 * POST: approves or rejects a request.
 */
export const POST = withAuth(REVIEWERS, async (request, { principal }) => {
  try {
    const userEmail = principal.email;

    const body = await request.json();
    const { requestId, action, comment } = body;

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
      const permissionCheck = await requirePermission(
        principal.id,
        Permission.SCRIPT_APPROVE
      );
      if (!permissionCheck.authorized) {
        return NextResponse.json(
          { success: false, message: "权限不足：无审批权限" },
          { status: 403 }
        );
      }

      result = await approveScript(requestId, principal.id, userEmail, comment);
    } else {
      const permissionCheck = await requirePermission(
        principal.id,
        Permission.SCRIPT_REJECT
      );
      if (!permissionCheck.authorized) {
        return NextResponse.json(
          { success: false, message: "权限不足：无拒绝权限" },
          { status: 403 }
        );
      }

      result = await rejectScript(requestId, principal.id, userEmail, comment);
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
});
