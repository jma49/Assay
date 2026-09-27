/**
 * Runs checks from the command line; the GitHub Actions schedule calls it.
 *   tsx scripts/run-all-scripts.ts [all|scheduled] [--dry-run]
 * "scheduled" runs each scheduled check once per cron slot; --dry-run only
 * lists what would run.
 */
import db from "@/lib/database/db";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { runCheckNow } from "@/server/services/run-check-deps";
import { mongoRunChecksStore, runChecks, type RunMode } from "@/server/services/run-checks";

function parseArgs(argv: string[]): { mode: RunMode; dryRun: boolean } | null {
  if (argv.includes("--help") || argv.includes("-h")) return null;
  const modeArg = argv.find((arg) => !arg.startsWith("-")) ?? "all";
  // "enabled" is an old name for "scheduled".
  const mode: RunMode = modeArg === "scheduled" || modeArg === "enabled" ? "scheduled" : "all";
  return { mode, dryRun: argv.includes("--dry-run") };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    console.log("Usage: tsx scripts/run-all-scripts.ts [all|scheduled] [--dry-run]");
    return;
  }
  for (const name of ["DATABASE_URL", "MONGODB_URI"]) {
    if (!process.env[name]) throw new Error(`${name} is not set`);
  }

  const mongo = await getMongoDbClient().getDb();
  try {
    const reports = await runChecks(
      { mode: args.mode, now: new Date(), dryRun: args.dryRun, trigger: { kind: args.mode === "scheduled" ? "schedule" : "batch" } },
      { ...mongoRunChecksStore(mongo), run: runCheckNow },
    );

    for (const report of reports) {
      const detail =
        report.status === "ran"
          ? report.result.kind === "completed"
            ? `${report.result.outcome}, ${report.result.rowCount} rows`
            : report.result.kind === "busy"
              ? "already running"
              : "not found"
          : report.status === "failed"
            ? report.error
            : report.status.replace("_", " ");
      console.log(`- ${report.scriptId}: ${detail}`);
    }
    const ran = reports.filter((r) => r.status === "ran").length;
    const failed = reports.filter((r) => r.status === "failed").length;
    console.log(`${args.dryRun ? "Dry run" : "Done"}: ${ran} ran, ${failed} failed, ${reports.length - ran - failed} skipped.`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await db.closePool();
    await getMongoDbClient().closeConnection();
  }
}

main().catch((error) => {
  console.error("Running checks failed:", error);
  process.exit(1);
});
