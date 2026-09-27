import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/auth/auth-utils";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { checksWithAllTags, historyFilter, historySort, parseHistoryParams } from "@/server/runs/history-query";
import { LEGACY_VIEW_FIELDS, toLegacyRunView } from "@/server/runs/legacy-view";
import { COLLECTIONS } from "@/lib/database/collections";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(Permission.HISTORY_READ);
    if (!authResult.isValid) return authResult.response;

    const params = parseHistoryParams(new URL(request.url).searchParams);
    const { page, limit, hashtags, includeResults } = params;
    const db = await getMongoDbClient().getDb();

    let taggedCheckIds: string[] | null = null;
    if (hashtags.length > 0) {
      const tagged = await db
        .collection<{ scriptId: string; hashtags?: string[] }>(COLLECTIONS.checks)
        .find({ hashtags: { $all: hashtags } }, { projection: { scriptId: 1, hashtags: 1 } })
        .toArray();
      taggedCheckIds = checksWithAllTags(tagged, hashtags);
    }

    const filter = historyFilter(params, taggedCheckIds);
    const runs = db.collection(COLLECTIONS.runs);
    const [docs, total] =
      taggedCheckIds?.length === 0
        ? [[], 0]
        : await Promise.all([
            runs
              .find(filter, { projection: { ...LEGACY_VIEW_FIELDS, github_run_id: 1, ...(includeResults && { raw_results: 1 }) } })
              .sort(historySort(params))
              .skip((page - 1) * limit)
              .limit(limit)
              .toArray(),
            runs.countDocuments(filter),
          ]);

    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({
      data: docs.map((run) => ({ ...toLegacyRunView(run, includeResults), github_run_id: run.github_run_id })),
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      query_info: {
        script_name: params.scriptName || undefined,
        status: params.status || undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        sort_by: params.sortBy,
        sort_order: params.sortOrder,
        include_results: includeResults,
      },
    });
  } catch (error) {
    console.error("[check-history] Reading run history failed:", error);
    return NextResponse.json({ message: "Internal Server Error fetching check history" }, { status: 500 });
  }
}
