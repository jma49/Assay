import type { Db, Document } from "mongodb";
import { COLLECTIONS } from "@/lib/database/collections";
import { cappedCount } from "@/server/http/paging";
import type { EditHistoryQuery } from "./query";

/**
 * One page of edit history and the (capped) total. A sorted, limited find
 * reads one page through the index instead of sorting every entry. Demo
 * guests see who made a change by name, never their email or id.
 */
export async function listEditHistory(db: Db, { filter, sort, page, limit }: EditHistoryQuery, forGuest: boolean) {
  const collection = db.collection(COLLECTIONS.editHistory);
  const [rows, count] = await Promise.all([
    collection.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).toArray(),
    cappedCount(collection, filter),
  ]);
  const histories = forGuest ? rows.map(({ userEmail: _email, userId: _id, ...row }: Document) => row) : rows;
  return { histories, count };
}
