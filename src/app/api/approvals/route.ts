import { intParam } from "@/lib/utils/query-params";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, parseJson, withAuth } from "@/server/http/route";
import { Permission, requirePermission } from "@/lib/auth/rbac";
import {
  getPendingApprovals,
  approveScript,
  rejectScript,
  getCompletedApprovals,
  getCurrentSql,
} from "@/lib/workflows/approval-workflow";
import { toApprovalDto } from "@/lib/workflows/approval-dto";

const REVIEWERS = { anyOf: [Permission.SCRIPT_APPROVE, Permission.SCRIPT_REJECT] };

const Decision = z.object({
  requestId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  comment: z.string().optional(),
});

/**
 * GET: pending requests, or decided ones for the history view.
 */
export const GET = withAuth(REVIEWERS, async (request, { principal }) => {
  const { searchParams } = new URL(request.url);
  const page = intParam(searchParams.get("page"), 1, 1, 10_000);
  const limit = intParam(searchParams.get("limit"), 20, 1, 100);

  if (searchParams.get("action") === "history") {
    const result = await getCompletedApprovals(page, limit);
    const data = result.data.map((request) => toApprovalDto(request));
    return NextResponse.json({ success: true, action: "history", data, pagination: result.pagination, count: data.length });
  }

  // What the reviewer may do with each request.
  const [canApprove, canReject] = await Promise.all([
    requirePermission(principal.id, Permission.SCRIPT_APPROVE),
    requirePermission(principal.id, Permission.SCRIPT_REJECT),
  ]);
  const result = await getPendingApprovals(principal.id, page, limit);
  // Edits and deletes are shown against the check's live SQL.
  const changesExisting = (request: (typeof result.data)[number]) => request.operationType !== "create";
  const currentSql = await getCurrentSql(result.data.filter(changesExisting).map((request) => request.scriptId));
  const data = result.data.map((request) =>
    toApprovalDto(request, changesExisting(request) ? currentSql.get(request.scriptId) : undefined),
  );

  return NextResponse.json({
    success: true,
    action: "pending",
    data,
    pagination: result.pagination,
    user_info: {
      userId: principal.id,
      email: principal.email,
      canApprove: canApprove.authorized,
      canReject: canReject.authorized,
    },
  });
});

/**
 * POST: approves or rejects a request.
 */
export const POST = withAuth(REVIEWERS, async (request, { principal }) => {
  const { requestId, action, comment } = await parseJson(request, Decision);
  if (action === "reject" && !comment) throw new ApiError(400, "comment_required", "Give a reason for rejecting");

  const permission = action === "approve" ? Permission.SCRIPT_APPROVE : Permission.SCRIPT_REJECT;
  if (!(await requirePermission(principal.id, permission)).authorized) {
    throw new ApiError(403, "forbidden", `You may not ${action} requests`);
  }

  const result =
    action === "approve"
      ? await approveScript(requestId, principal.id, principal.email, comment)
      : await rejectScript(requestId, principal.id, principal.email, comment ?? "");
  if (!result.success) throw new ApiError(400, result.code, result.message);

  return NextResponse.json({
    success: true,
    message: result.message,
    data: { requestId, action, reviewedBy: principal.email, reviewedAt: new Date(), comment },
  });
});
