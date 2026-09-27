/**
 * Runs one check from the command line; the manual GitHub workflow calls it.
 *   tsx scripts/run-sql.ts <scriptId>
 */
import db from "@/lib/database/db";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { runCheckNow } from "@/server/services/run-check-deps";

async function main() {
  const scriptId = process.argv[2];
  if (!scriptId) {
    console.log("Usage: tsx scripts/run-sql.ts <scriptId>");
    process.exit(1);
  }
  try {
    const result = await runCheckNow(scriptId, { kind: "manual", by: { id: "cli", name: "Command line" } });
    if (result.kind === "missing") throw new Error(`No check with id ${scriptId}`);
    if (result.kind === "busy") {
      console.log(`${scriptId} is already running (run ${result.runId}).`);
      return;
    }
    console.log(`${scriptId}: ${result.outcome}, ${result.rowCount} rows. ${result.message}`);
    if (result.outcome === "error") process.exitCode = 1;
  } finally {
    await db.closePool();
    await getMongoDbClient().closeConnection();
  }
}

main().catch((error) => {
  console.error("Running the check failed:", error);
  process.exit(1);
});
