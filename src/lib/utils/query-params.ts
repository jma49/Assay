/**
 * Safe readers for query-string values that end up in database queries.
 */

/** A whole number within [min, max]; anything missing or not a number gives the fallback. */
export function intParam(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** Longest text we search for; longer input is cut, not rejected. */
export const MAX_SEARCH_LENGTH = 100;

/**
 * A case-insensitive "contains" match for MongoDB. The text is escaped, so
 * a caller cannot send a regular expression (and with it a pattern that
 * makes the server backtrack for seconds).
 */
export function containsText(value: string): { $regex: string; $options: "i" } {
  const text = value.slice(0, MAX_SEARCH_LENGTH);
  return { $regex: text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
}
