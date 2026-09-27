import { containsText, intParam } from "@/lib/utils/query-params";
import { NextResponse } from "next/server";
import { withAuth } from "@/server/http/route";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { Collection, Document } from "mongodb";
import { EditHistoryFilter } from "@/lib/workflows/edit-history-schema";
import { COLLECTIONS } from "@/lib/database/collections";

async function getEditHistoryCollection(): Promise<Collection<Document>> {
  const mongoDbClient = getMongoDbClient();
  const db = await mongoDbClient.getDb();
  return db.collection(COLLECTIONS.editHistory);
}

// Edit history is written only on the server (recordEditHistoryOnServer),
// so there is deliberately no POST: clients could otherwise forge entries.

export const GET = withAuth(Permission.HISTORY_READ, async (request, { principal }) => {
  try {
    const { searchParams } = new URL(request.url);

    const filter: EditHistoryFilter = {
      scriptName: searchParams.get("scriptName") || undefined,
      author: searchParams.get("author") || undefined,
      operation:
        (searchParams.get("operation") as EditHistoryFilter["operation"]) ||
        undefined,
      dateFrom: searchParams.get("dateFrom")
        ? new Date(searchParams.get("dateFrom")!)
        : undefined,
      dateTo: searchParams.get("dateTo")
        ? new Date(searchParams.get("dateTo")!)
        : undefined,
      page: intParam(searchParams.get("page"), 1, 1, 100_000),
      limit: intParam(searchParams.get("limit"), 20, 1, 100),
      sortBy:
        (searchParams.get("sortBy") as EditHistoryFilter["sortBy"]) ||
        "operationTime",
      sortOrder:
        (searchParams.get("sortOrder") as EditHistoryFilter["sortOrder"]) ||
        "desc",
    };

    const scriptId = searchParams.get("scriptId");

    const collection = await getEditHistoryCollection();

    const query: Record<string, unknown> = {};

    if (scriptId) {
      query["scriptSnapshot.scriptId"] = scriptId;
    }

    if (filter.scriptName) {
      const scriptNameRegex = containsText(filter.scriptName);
      query.$or = [
        { searchableScriptName: scriptNameRegex },
        { searchableScriptNameCn: scriptNameRegex },
        { "scriptSnapshot.scriptId": scriptNameRegex },
      ];
    }

    if (filter.author) {
      query.searchableAuthor = containsText(filter.author);
    }

    if (filter.operation && filter.operation !== "all") {
      query.operationType = filter.operation;
    }

    if (filter.dateFrom || filter.dateTo) {
      query.operationTime = {};
      if (filter.dateFrom) {
        (query.operationTime as Record<string, unknown>).$gte = filter.dateFrom;
      }
      if (filter.dateTo) {
        // Through the end of that day.
        const endDate = new Date(filter.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        (query.operationTime as Record<string, unknown>).$lt = endDate;
      }
    }

    const sort: Record<string, 1 | -1> = {};
    if (filter.sortBy === "operationTime") {
      sort.operationTime = filter.sortOrder === "asc" ? 1 : -1;
    } else if (filter.sortBy === "scriptName") {
      sort.searchableScriptName = filter.sortOrder === "asc" ? 1 : -1;
    } else if (filter.sortBy === "author") {
      sort.searchableAuthor = filter.sortOrder === "asc" ? 1 : -1;
    }

    const skip = ((filter.page || 1) - 1) * (filter.limit || 20);

    // One round trip for the page and the total count.
    const aggregationPipeline = [
      { $match: query },

      { $sort: sort },

      {
        $facet: {
          data: [{ $skip: skip }, { $limit: filter.limit || 20 }],
          count: [{ $count: "total" }],
        },
      },
    ];

    const result = await collection.aggregate(aggregationPipeline).toArray();
    const rows: Document[] = result[0]?.data || [];
    const total = result[0]?.count?.[0]?.total || 0;
    // Demo guests see who made a change by name, never their email or id.
    const historyList = principal.isGuest ? rows.map(({ userEmail: _email, userId: _id, ...row }) => row) : rows;

    return NextResponse.json({
      histories: historyList,
      pagination: {
        page: filter.page || 1,
        limit: filter.limit || 20,
        total,
        totalPages: Math.ceil(total / (filter.limit || 20)),
      },
    });
  } catch (error) {
    console.error("[edit-history] Query failed:", error);
    return NextResponse.json({ error: "查询编辑历史失败" }, { status: 500 });
  }
});
