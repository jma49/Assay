/**
 * Page-and-limit lists (run history, edit history). Counting stops at
 * COUNT_CAP, and paging too: a total beyond it shows as "10000+" and no
 * page starts past it, so neither the count nor `skip` walks a whole
 * collection. Narrowing the filters reaches older entries.
 */
export const COUNT_CAP = 10_000;

/** The last page that starts within COUNT_CAP. */
export const maxPage = (limit: number) => Math.max(1, Math.ceil(COUNT_CAP / limit));

export interface CappedCount {
  total: number;
  /** More than `total` match. */
  capped: boolean;
}

interface Countable {
  estimatedDocumentCount(): Promise<number>;
  countDocuments(filter: Record<string, unknown>, options: { limit: number }): Promise<number>;
}

/** How many documents match, up to COUNT_CAP. Without a filter it reads the collection's metadata instead of scanning it. */
export async function cappedCount(collection: Countable, filter: Record<string, unknown>): Promise<CappedCount> {
  const count =
    Object.keys(filter).length === 0
      ? await collection.estimatedDocumentCount()
      : await collection.countDocuments(filter, { limit: COUNT_CAP + 1 });
  return count > COUNT_CAP ? { total: COUNT_CAP, capped: true } : { total: count, capped: false };
}

/** The pagination block of a list response. */
export function pagination(page: number, limit: number, count: CappedCount) {
  const totalPages = Math.ceil(count.total / limit);
  return { page, limit, total: count.total, totalCapped: count.capped, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}
