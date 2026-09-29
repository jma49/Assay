import { NextResponse } from "next/server";
import { withAuth } from "@/server/http/route";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { pagination } from "@/server/http/paging";
import { runHistoryPage } from "@/server/runs/history";
import { parseHistoryParams } from "@/server/runs/history-query";

export const GET = withAuth(Permission.HISTORY_READ, async (request) => {
  const params = parseHistoryParams(new URL(request.url).searchParams);
  const { runs, count } = await runHistoryPage(await getMongoDbClient().getDb(), params);

  return NextResponse.json({
    data: runs.map((run) => ({
      _id: String(run._id),
      checkId: run.checkId,
      finishedAt: run.finishedAt,
      outcome: run.outcome,
      rowCount: typeof run.rowCount === "number" ? run.rowCount : null,
      error: run.error ?? null,
      message: run.message ?? "",
      findings: run.findings ?? "",
      github_run_id: run.github_run_id,
    })),
    pagination: pagination(params.page, params.limit, count),
    query_info: {
      search: params.search || undefined,
      checkId: params.checkId || undefined,
      outcome: params.outcome || undefined,
      hashtags: params.hashtags.length > 0 ? params.hashtags : undefined,
      sort_by: params.sortBy,
      sort_order: params.sortOrder,
    },
  });
});
