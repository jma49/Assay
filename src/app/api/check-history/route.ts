import { NextResponse } from "next/server";
import { withAuth } from "@/server/http/route";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { checksWithAllTags, historyFilter, historySort, parseHistoryParams } from "@/server/runs/history-query";
import { SAMPLE_FIELDS, storedSample } from "@/server/runs/sample";
import { COLLECTIONS } from "@/lib/database/collections";

/** The run fields the list shows; the sample is read only when asked for. */
const RUN_FIELDS = { checkId: 1, finishedAt: 1, outcome: 1, message: 1, findings: 1, github_run_id: 1 } as const;

export const GET = withAuth(Permission.HISTORY_READ, async (request) => {
  try {
    const params = parseHistoryParams(new URL(request.url).searchParams);
    const { page, limit, hashtags, includeSample } = params;
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
              .find(filter, { projection: { ...RUN_FIELDS, ...(includeSample && SAMPLE_FIELDS) } })
              .sort(historySort(params))
              .skip((page - 1) * limit)
              .limit(limit)
              .toArray(),
            runs.countDocuments(filter),
          ]);

    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({
      data: docs.map((run) => ({
        _id: String(run._id),
        checkId: run.checkId,
        finishedAt: run.finishedAt,
        outcome: run.outcome,
        message: run.message ?? "",
        findings: run.findings ?? "",
        github_run_id: run.github_run_id,
        ...(includeSample && { sample: storedSample(run) }),
      })),
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      query_info: {
        search: params.search || undefined,
        checkId: params.checkId || undefined,
        outcome: params.outcome || undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        sort_by: params.sortBy,
        sort_order: params.sortOrder,
        include_sample: includeSample,
      },
    });
  } catch (error) {
    console.error("[check-history] Reading run history failed:", error);
    return NextResponse.json({ message: "Internal Server Error fetching check history" }, { status: 500 });
  }
});
