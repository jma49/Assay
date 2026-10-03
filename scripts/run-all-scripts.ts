/**
 * Runs checks from the command line; the GitHub Actions schedule calls it.
 *   tsx scripts/run-all-scripts.ts [all|scheduled] [--dry-run]
 *   tsx scripts/run-all-scripts.ts --check=<scriptId>
 * "scheduled" runs each scheduled check once per cron slot; --dry-run only
 * lists what would run; --check runs one check now, as a manual run.
 */
import db from "@/lib/database/db";
import { closeSourcePools } from "@/server/datasource/sources";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { runCheckNow } from "@/server/services/run-check-deps";
import { mongoRunChecksStore, runChecks } from "@/server/services/run-checks";
import { errorKind, inPublicCi } from "@/lib/utils/public-log";
import { parseRunArgs, USAGE } from "./lib/run-args";
import { recordHeartbeat, SCHEDULER_NAME } from "@/server/repos/heartbeat-store";
import { reportLine, resultDetail } from "./lib/run-report";

async function main() {
  const argv = process.argv.slice(2);
  const args = parseRunArgs(argv);
  if (!args) {
    console.log(USAGE);
    if (argv.some((arg) => arg.startsWith("--check="))) process.exitCode = 2;
    return;
  }
  for (const name of ["DATABASE_URL", "MONGODB_URI"]) {
    if (!process.env[name]) throw new Error(`${name} is not set`);
  }

  const publicLog = inPublicCi();
  const mongo = await getMongoDbClient().getDb();
  if (args.kind !== "one" && !args.dryRun) {
    // The scheduler's heartbeat: /api/health reports the scheduler as stale
    // when no run started in the last hour, so a dead schedule is visible.
    // One-off manual runs do not count: they must not mask a dead schedule.
    await recordHeartbeat(mongo, SCHEDULER_NAME, { runId: process.env.GITHUB_RUN_ID, mode: args.mode });
  }
  try {
    if (args.kind === "one") {
      const result = await runCheckNow(args.checkId, { kind: "manual", by: { id: "cli", name: "Command line" } });
      console.log(`- ${args.checkId}: ${resultDetail(result, publicLog)}`);
      if (result.kind === "missing" || (result.kind === "completed" && result.outcome === "error")) process.exitCode = 1;
      return;
    }
    const reports = await runChecks(
      { mode: args.mode, now: new Date(), dryRun: args.dryRun, trigger: { kind: args.mode === "scheduled" ? "schedule" : "batch" } },
      { ...mongoRunChecksStore(mongo), run: runCheckNow },
    );

    for (const report of reports) console.log(reportLine(report, publicLog));
    const ran = reports.filter((r) => r.status === "ran").length;
    const failed = reports.filter((r) => r.status === "failed").length;
    console.log(`${args.dryRun ? "Dry run" : "Done"}: ${ran} ran, ${failed} failed, ${reports.length - ran - failed} skipped.`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await Promise.all([db.closePool(), closeSourcePools()]);
    await getMongoDbClient().closeConnection();
  }
}

main().catch((error) => {
  // Public CI logs get the error's type only; its text can hold data or hosts.
  console.error("Running checks failed:", inPublicCi() ? errorKind(error) : error);
  process.exit(1);
});
