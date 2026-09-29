import type { ActivityItem } from "@/contracts/activity";

export interface FeedPage {
  cursor: string | null;
  items: ActivityItem[];
}

/**
 * Adds a fetched page to the feed: the first page (no cursor) replaces
 * everything, "Show older" appends, and a page already shown is not added twice.
 */
export function addPage(pages: FeedPage[], cursor: string | null, items: ActivityItem[]): FeedPage[] {
  if (cursor === null) return [{ cursor, items }];
  return pages.some((page) => page.cursor === cursor) ? pages : [...pages, { cursor, items }];
}
