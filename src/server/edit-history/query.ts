import { containsText, intParam } from "@/lib/utils/query-params";
import { maxPage } from "@/server/http/paging";

const SORT_FIELDS = { operationTime: "operationTime", scriptName: "searchableScriptName", author: "searchableAuthor" } as const;
const OPERATIONS = ["create", "update", "delete"] as const;

export interface EditHistoryQuery {
  filter: Record<string, unknown>;
  sort: Record<string, 1 | -1>;
  page: number;
  limit: number;
}

export type ParsedEditHistoryQuery = { ok: true; query: EditHistoryQuery } | { ok: false; message: string };

function dateParam(value: string | null): Date | null | "invalid" {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "invalid" : date;
}

/**
 * Validates the edit-history list's query string. Unknown sort fields,
 * orders, operations and dates are refused (400) instead of reaching
 * MongoDB, where an empty `$sort` or an Invalid Date would fail the request.
 */
export function parseEditHistoryQuery(params: URLSearchParams): ParsedEditHistoryQuery {
  const sortBy = params.get("sortBy") || "operationTime";
  if (!Object.hasOwn(SORT_FIELDS, sortBy)) return { ok: false, message: `Unknown sortBy: ${sortBy}` };
  const sortOrder = params.get("sortOrder") || "desc";
  if (sortOrder !== "asc" && sortOrder !== "desc") return { ok: false, message: `Unknown sortOrder: ${sortOrder}` };
  const operation = params.get("operation") || "all";
  if (operation !== "all" && !(OPERATIONS as readonly string[]).includes(operation)) return { ok: false, message: `Unknown operation: ${operation}` };
  const dateFrom = dateParam(params.get("dateFrom"));
  const dateTo = dateParam(params.get("dateTo"));
  if (dateFrom === "invalid" || dateTo === "invalid") return { ok: false, message: "Invalid date" };

  const filter: Record<string, unknown> = {};
  const scriptId = params.get("scriptId");
  if (scriptId) filter["scriptSnapshot.scriptId"] = scriptId;
  const scriptName = params.get("scriptName");
  if (scriptName) {
    const text = containsText(scriptName);
    filter.$or = [{ searchableScriptName: text }, { searchableScriptNameCn: text }, { "scriptSnapshot.scriptId": text }];
  }
  const author = params.get("author");
  if (author) filter.searchableAuthor = containsText(author);
  if (operation !== "all") filter.operationType = operation;
  if (dateFrom || dateTo) {
    // Through the end of the `dateTo` day.
    const end = dateTo && new Date(dateTo.getTime() + 86_400_000);
    filter.operationTime = { ...(dateFrom && { $gte: dateFrom }), ...(end && { $lt: end }) };
  }

  const direction = sortOrder === "asc" ? 1 : -1;
  const field = SORT_FIELDS[sortBy as keyof typeof SORT_FIELDS];
  // By time (what the page uses) walks the operationTime index. By name or
  // author sorts the matching entries, newest first within one; the
  // collection is small and grows only with edits.
  const sort: Record<string, 1 | -1> = field === "operationTime" ? { operationTime: direction } : { [field]: direction, operationTime: -1 };

  const limit = intParam(params.get("limit"), 20, 1, 100);
  return { ok: true, query: { filter, sort, page: intParam(params.get("page"), 1, 1, maxPage(limit)), limit } };
}
