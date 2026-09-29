import type { Db, Document } from "mongodb";
import { COLLECTIONS } from "@/lib/database/collections";
import type { CappedCount } from "@/server/http/paging";
import { aggregateRuns, countRuns, listRuns } from "@/server/repos/runs";
import {
  checkNameOrder,
  checksMatchingName,
  checksWithAllTags,
  historyFilter,
  historySort,
  nameSortPipeline,
  type CheckName,
  type HistoryParams,
} from "./history-query";

/** The run fields the list shows; never the sample or the row fingerprints. */
const LIST_FIELDS = { checkId: 1, finishedAt: 1, outcome: 1, rowCount: 1, error: 1, message: 1, findings: 1, github_run_id: 1 } as const;

/**
 * One page of the run history and how many runs match. Hashtags, the name
 * search and the name sort live on the checks, so those read the check list
 * first and filter runs by check id.
 */
export async function runHistoryPage(db: Db, params: HistoryParams): Promise<{ runs: Document[]; count: CappedCount }> {
  const checks = db.collection(COLLECTIONS.checks);

  let taggedCheckIds: string[] | null = null;
  if (params.hashtags.length > 0) {
    const tagged = await checks
      .find<{ scriptId: string; hashtags?: string[] }>({ hashtags: { $all: params.hashtags } }, { projection: { scriptId: 1, hashtags: 1 } })
      .toArray();
    taggedCheckIds = checksWithAllTags(tagged, params.hashtags);
    if (taggedCheckIds.length === 0) return { runs: [], count: { total: 0, capped: false } };
  }

  const byName = params.sortBy === "name";
  const names =
    params.search || byName
      ? await checks.find<CheckName>({}, { projection: { _id: 0, scriptId: 1, name: 1, cnName: 1 } }).toArray()
      : [];

  const filter = historyFilter(params, taggedCheckIds, params.search ? checksMatchingName(names, params.search) : []);
  const onePage = byName
    ? aggregateRuns(db, nameSortPipeline(filter, checkNameOrder(names, params.language), params, LIST_FIELDS))
    : listRuns(db, { filter, sort: historySort(params), page: params.page, limit: params.limit, projection: LIST_FIELDS });
  const [runs, count] = await Promise.all([onePage, countRuns(db, filter)]);
  return { runs, count };
}
