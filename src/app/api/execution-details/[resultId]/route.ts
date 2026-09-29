import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ApiError, withAuth } from "@/server/http/route";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { runReport } from "@/server/runs/report";

export const GET = withAuth<{ resultId: string }>(Permission.HISTORY_READ, async (_request, { principal, params }) => {
  if (!ObjectId.isValid(params.resultId)) throw new ApiError(400, "invalid_input", "Invalid run id");
  const report = await runReport(await getMongoDbClient().getDb(), params.resultId, principal);
  if (!report) throw new ApiError(404, "not_found", "No run with this id");
  return NextResponse.json(report);
});
