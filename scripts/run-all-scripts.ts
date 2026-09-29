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
import { errorKind, inPublicCi } from "@/lib/utils/public-log";
import { reportLine } from "./lib/run-report";

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

    const publicLog = inPublicCi();
    for (const report of reports) console.log(reportLine(report, publicLog));
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
  // Public CI logs get the error's type only; its text can hold data or hosts.
  console.error("Running checks failed:", inPublicCi() ? errorKind(error) : error);
  process.exit(1);
});
