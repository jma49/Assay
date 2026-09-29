import type { RunMode } from "@/server/services/run-checks";

export type RunArgs = { kind: "batch"; mode: RunMode; dryRun: boolean } | { kind: "one"; checkId: string };

export const USAGE = "Usage: tsx scripts/run-all-scripts.ts [all|scheduled] [--dry-run] | --check=<scriptId>";

// Check ids are slugs; a looser rule keeps older ids working while refusing
// anything that could read as an option or carry spaces.
const CHECK_ID = /^[A-Za-z0-9][\w.-]{0,127}$/;

/** The command line of run-all-scripts, or null for help or an invalid call. */
export function parseRunArgs(argv: string[]): RunArgs | null {
  if (argv.includes("--help") || argv.includes("-h")) return null;
  const check = argv.find((arg) => arg.startsWith("--check="));
  if (check !== undefined) {
    const checkId = check.slice("--check=".length).trim();
    return CHECK_ID.test(checkId) ? { kind: "one", checkId } : null;
  }
  const modeArg = argv.find((arg) => !arg.startsWith("-")) ?? "all";
  // "enabled" is an old name for "scheduled".
  const mode: RunMode = modeArg === "scheduled" || modeArg === "enabled" ? "scheduled" : "all";
  return { kind: "batch", mode, dryRun: argv.includes("--dry-run") };
}
