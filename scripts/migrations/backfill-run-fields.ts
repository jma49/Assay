/**
 * Gives runs saved before the run pipeline the fields every reader now
 * uses: checkId, finishedAt, outcome and rowCount, derived from the legacy
 * script_name, execution_time, statusType and raw_results. One server-side
 * update; runs that already have the fields are left alone. Dry run unless
 * --apply.
 *   tsx -r dotenv/config scripts/migrations/backfill-run-fields.ts [--apply]
 */
import { getMongoDbClient } from "@/lib/database/mongodb";

async function main() {
  const apply = process.argv.includes("--apply");
  const mongo = getMongoDbClient();
  try {
    const runs = (await mongo.getDb()).collection("result");
    const filter = { $or: [{ checkId: { $exists: false } }, { finishedAt: { $exists: false } }, { outcome: { $exists: false } }, { rowCount: { $exists: false } }] };
    const pending = await runs.countDocuments(filter);
    console.log(`${pending} runs miss a new field.`);
    if (!apply) {
      console.log("Dry run. Re-run with --apply.");
      return;
    }
    const { modifiedCount } = await runs.updateMany(filter, [
      {
        $set: {
          checkId: { $ifNull: ["$checkId", "$script_name"] },
          finishedAt: { $ifNull: ["$finishedAt", "$execution_time"] },
          outcome: {
            $ifNull: [
              "$outcome",
              { $switch: { branches: [{ case: { $eq: ["$statusType", "failure"] }, then: "error" }, { case: { $eq: ["$statusType", "attention_needed"] }, then: "issues" }], default: "clean" } },
            ],
          },
          rowCount: { $ifNull: ["$rowCount", { $size: { $ifNull: ["$raw_results", []] } }] },
        },
      },
    ]);
    console.log(`Back-filled ${modifiedCount} runs.`);
  } finally {
    await mongo.closeConnection();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
