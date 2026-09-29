/**
 * Runs one check from the command line.
 *   tsx scripts/run-sql.ts <scriptId>
 */
import db from "@/lib/database/db";
import { closeSourcePools } from "@/server/datasource/sources";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { errorKind, inPublicCi } from "@/lib/utils/public-log";
import { runCheckNow } from "@/server/services/run-check-deps";
import { resultDetail } from "./lib/run-report";

async function main() {
  const scriptId = process.argv[2];
  if (!scriptId) {
    console.log("Usage: tsx scripts/run-sql.ts <scriptId>");
    process.exit(1);
  }
  try {
    const result = await runCheckNow(scriptId, { kind: "manual", by: { id: "cli", name: "Command line" } });
    if (result.kind === "busy") {
      console.log(`${scriptId} is already running (run ${result.runId}).`);
      return;
    }
    console.log(`${scriptId}: ${resultDetail(result, inPublicCi())}`);
    if (result.kind === "missing" || result.outcome === "error") process.exitCode = 1;
  } finally {
    await Promise.all([db.closePool(), closeSourcePools()]);
    await getMongoDbClient().closeConnection();
  }
}

main().catch((error) => {
  // Public CI logs get the error's type only; its text can hold data or hosts.
  console.error("Running the check failed:", inPublicCi() ? errorKind(error) : error);
  process.exit(1);
});
