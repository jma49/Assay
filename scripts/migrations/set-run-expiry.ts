/**
 * Gives runs saved before retention an expiresAt (execution_time plus
 * RUN_RETENTION_DAYS), so the TTL index deletes them on the same rule as
 * new runs. Runs already past it are deleted by MongoDB shortly after.
 * Dry run unless --apply.
 *   tsx -r dotenv/config scripts/migrations/set-run-expiry.ts [--apply]
 */
import { runRetentionDays } from "@/domain/run";
import { getMongoDbClient } from "@/lib/database/mongodb";

async function main() {
  const apply = process.argv.includes("--apply");
  const days = runRetentionDays();
  const mongo = getMongoDbClient();
  try {
    const runs = (await mongo.getDb()).collection("result");
    const filter = { expiresAt: { $exists: false }, execution_time: { $type: "date" } };
    const total = await runs.countDocuments(filter);
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const expired = await runs.countDocuments({ ...filter, execution_time: { $lt: cutoff } });
    if (days === 0) {
      console.log("RUN_RETENTION_DAYS=0 keeps runs forever; nothing to do.");
      return;
    }
    console.log(`${total} runs have no expiry; ${expired} of them are older than ${days} days and will be deleted once marked.`);
    if (!apply) {
      console.log("Dry run. Re-run with --apply.");
      return;
    }
    // One update on the server: expiresAt = execution_time + days.
    const { modifiedCount } = await runs.updateMany(filter, [
      { $set: { expiresAt: { $dateAdd: { startDate: "$execution_time", unit: "day", amount: days } } } },
    ]);
    console.log(`Set expiresAt on ${modifiedCount} runs.`);
  } finally {
    await mongo.closeConnection();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
