/**
 * Gives every check that ran before state was kept its current state, built
 * from its run history. Checks that already have state are left alone.
 *   tsx -r dotenv/config scripts/backfill-check-state.ts [--dry-run]
 */
import db from "@/lib/database/db";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { fromLegacyStatus, stateFromHistory, type HistoricalRun } from "@/domain/run";

// Enough runs to find when the current streak began for any realistic schedule.
const HISTORY_LIMIT = 500;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const mongo = await getMongoDbClient().getDb();
  const checks = mongo.collection("sql_scripts");
  const runs = mongo.collection("result");

  const pending = await checks.find({ state: { $exists: false } }, { projection: { scriptId: 1 } }).toArray();
  let updated = 0;
  for (const { scriptId } of pending) {
    const history = await runs
      .find({ script_name: scriptId }, { projection: { statusType: 1, outcome: 1, rowCount: 1, raw_results: 1, execution_time: 1 } })
      .sort({ execution_time: -1 })
      .limit(HISTORY_LIMIT)
      .toArray();
    const state = stateFromHistory(
      history.map(
        (run): HistoricalRun => ({
          runId: run._id.toString(),
          outcome: run.outcome ?? fromLegacyStatus(run.statusType),
          rowCount: typeof run.rowCount === "number" ? run.rowCount : Array.isArray(run.raw_results) ? run.raw_results.length : 0,
          finishedAt: new Date(run.execution_time),
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
      const result = await checks.updateOne({ scriptId, state: { $exists: false } }, { $set: { state } });
      updated += result.modifiedCount;
    }
  }
  console.log(dryRun ? `Dry run: ${pending.length} checks without state.` : `Back-filled ${updated} of ${pending.length} checks.`);
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
