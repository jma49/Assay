import { NextResponse } from "next/server";
import { withAuth } from "@/server/http/route";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { cappedCount, pagination } from "@/server/http/paging";
import { checksWithAllTags, historyFilter, historySort, parseHistoryParams } from "@/server/runs/history-query";
import { COLLECTIONS } from "@/lib/database/collections";

/** The run fields the list shows; never the sample or the row fingerprints. */
const RUN_FIELDS = { checkId: 1, finishedAt: 1, outcome: 1, message: 1, findings: 1, github_run_id: 1 } as const;

export const GET = withAuth(Permission.HISTORY_READ, async (request) => {
  try {
    const params = parseHistoryParams(new URL(request.url).searchParams);
    const { page, limit, hashtags } = params;
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
    const [docs, count] =
      taggedCheckIds?.length === 0
        ? [[], { total: 0, capped: false }]
        : await Promise.all([
            runs
              .find(filter, { projection: RUN_FIELDS })
              .sort(historySort(params))
              .skip((page - 1) * limit)
              .limit(limit)
              .toArray(),
            cappedCount(runs, filter),
          ]);

    return NextResponse.json({
      data: docs.map((run) => ({
        _id: String(run._id),
        checkId: run.checkId,
        finishedAt: run.finishedAt,
        outcome: run.outcome,
        message: run.message ?? "",
        findings: run.findings ?? "",
        github_run_id: run.github_run_id,
      })),
      pagination: pagination(page, limit, count),
      query_info: {
        search: params.search || undefined,
        checkId: params.checkId || undefined,
        outcome: params.outcome || undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        sort_by: params.sortBy,
        sort_order: params.sortOrder,
      },
    });
  } catch (error) {
    console.error("[check-history] Reading run history failed:", error);
    return NextResponse.json({ message: "Internal Server Error fetching check history" }, { status: 500 });
  }
});
