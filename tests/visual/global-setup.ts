import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { FullConfig } from "@playwright/test";

const NOW_FILE = ".visual/now.txt";

/**
 * Relative times ("3 minutes ago") must read the same in the baseline and in
 * the comparison, so every page runs with the browser clock frozen at one
 * instant: VISUAL_NOW when it is set (CI), else the moment the baseline was
 * recorded.
 */
export default function globalSetup(config: FullConfig) {
  if (process.env.VISUAL_NOW) return;
  const recording = config.updateSnapshots === "all" || config.updateSnapshots === "changed";
  if (recording) {
    mkdirSync(".visual", { recursive: true });
    writeFileSync(NOW_FILE, new Date().toISOString());
  } else if (!existsSync(NOW_FILE)) {
    throw new Error("No baseline yet: run `npm run visual:baseline` before `npm run visual`.");
  }
  process.env.VISUAL_NOW = readFileSync(NOW_FILE, "utf8").trim();
}
