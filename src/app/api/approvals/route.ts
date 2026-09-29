import { NextResponse } from "next/server";
import { z } from "zod";
import { Permission, requirePermission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { intParam } from "@/lib/utils/query-params";
import { ApiError, parseJson, withAuth } from "@/server/http/route";
import { approveRequest, decidedApprovals, pendingApprovals, rejectRequest } from "@/server/services/approvals";
import { actorOf } from "@/server/services/check-writes";

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
  const db = await getMongoDbClient().getDb();

  if (searchParams.get("action") === "history") {
    const { data, pagination } = await decidedApprovals(db, page, limit);
    return NextResponse.json({ success: true, action: "history", data, pagination, count: data.length });
  }

  // What the reviewer may do with each request.
  const [canApprove, canReject] = await Promise.all([
    requirePermission(principal.id, Permission.SCRIPT_APPROVE),
    requirePermission(principal.id, Permission.SCRIPT_REJECT),
  ]);
  const { data, pagination } = await pendingApprovals(db, page, limit);
  return NextResponse.json({
    success: true,
    action: "pending",
    data,
    pagination,
    user_info: { userId: principal.id, email: principal.email, canApprove: canApprove.authorized, canReject: canReject.authorized },
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

  const db = await getMongoDbClient().getDb();
  const reviewer = actorOf(principal);
  if (action === "approve") await approveRequest(db, requestId, reviewer, comment);
  else await rejectRequest(db, requestId, reviewer, comment ?? "");

  return NextResponse.json({
    success: true,
    message: action === "approve" ? "Approved" : "Rejected",
    data: { requestId, action, reviewedBy: principal.email, reviewedAt: new Date(), comment },
  });
});
