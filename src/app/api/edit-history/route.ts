import { NextResponse } from "next/server";
import type { Document } from "mongodb";
import { withAuth } from "@/server/http/route";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { COLLECTIONS } from "@/lib/database/collections";
import { parseEditHistoryQuery } from "@/server/edit-history/query";
import { cappedCount, pagination } from "@/server/http/paging";

// Edit history is written only on the server (recordEditHistoryOnServer),
// so there is deliberately no POST: clients could otherwise forge entries.

export const GET = withAuth(Permission.HISTORY_READ, async (request, { principal }) => {
  const parsed = parseEditHistoryQuery(new URL(request.url).searchParams);
  if (!parsed.ok) return NextResponse.json({ error: parsed.message }, { status: 400 });
  const { filter, sort, page, limit } = parsed.query;
  try {
    const collection = (await getMongoDbClient().getDb()).collection(COLLECTIONS.editHistory);
    // A sorted, limited find reads one page through the index instead of sorting every entry.
    const [rows, count] = await Promise.all([
      collection.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).toArray(),
      cappedCount(collection, filter),
    ]);
    // Demo guests see who made a change by name, never their email or id.
    const histories = principal.isGuest ? rows.map(({ userEmail: _email, userId: _id, ...row }: Document) => row) : rows;
    return NextResponse.json({ histories, pagination: pagination(page, limit, count) });
  } catch (error) {
    console.error("[edit-history] Query failed:", error);
    return NextResponse.json({ error: "查询编辑历史失败" }, { status: 500 });
  }
});
