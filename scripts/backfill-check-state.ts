/**
 * Gives every check that ran before state was kept its current state, built
 * from its run history. Checks that already have state are left alone,
 * unless --recompute rebuilds every check's state from its history (for
 * state written before runs continued from history).
 *   tsx -r dotenv/config scripts/backfill-check-state.ts [--dry-run] [--recompute]
 */
import db from "@/lib/database/db";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { stateFromHistory, type HistoricalRun } from "@/domain/run";

// Enough runs to find when the current streak began for any realistic schedule.
const HISTORY_LIMIT = 500;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const recompute = process.argv.includes("--recompute");
  const mongo = await getMongoDbClient().getDb();
  const checks = mongo.collection("sql_scripts");
  const runs = mongo.collection("result");

  const pending = await checks.find(recompute ? {} : { state: { $exists: false } }, { projection: { scriptId: 1 } }).toArray();
  let updated = 0;
  for (const { scriptId } of pending) {
    const history = await runs
      .find({ checkId: scriptId }, { projection: { outcome: 1, rowCount: 1, finishedAt: 1 } })
      .sort({ finishedAt: -1 })
      .limit(HISTORY_LIMIT)
      .toArray();
    const state = stateFromHistory(
      history.map(
        (run): HistoricalRun => ({
          runId: run._id.toString(),
          outcome: run.outcome,
          rowCount: Number(run.rowCount ?? 0),
          finishedAt: new Date(run.finishedAt),
        }),
      ),
    );
    if (!state) {
      console.log(`- ${scriptId}: no runs yet, left without state`);
      continue;
    }
    console.log(`- ${scriptId}: ${state.outcome} since ${state.since.toISOString()}, ${state.rowCount} rows`);
    if (!dryRun) {
      // The filter keeps a run that finished meanwhile from being overwritten.
      const result = await checks.updateOne(recompute ? { scriptId } : { scriptId, state: { $exists: false } }, { $set: { state } });
      updated += result.modifiedCount;
    }
  }
  const scope = recompute ? "checks" : "checks without state";
  console.log(dryRun ? `Dry run: ${pending.length} ${scope}.` : `Updated ${updated} of ${pending.length} ${scope}.`);
}

main()
  .catch((error) => {
    console.error("Back-fill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.closePool();
    await getMongoDbClient().closeConnection();
  });
