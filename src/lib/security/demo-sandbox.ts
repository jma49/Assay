/**
 * The public demo lets viewers run the sample checks, so visitors can see a
 * check find problems without being given the developer role. It is off
 * unless DEMO_MODE=true on the server, only covers checks created by the
 * demo seed, and is rate limited per user.
 */
export const DEMO_AUTHOR = "demo-seed";
export const DEMO_RUNS_PER_HOUR = 20;

export function isDemoMode(env: Record<string, string | undefined> = process.env): boolean {
  return env.DEMO_MODE === "true";
}

export type RunAccess = "allowed" | "demo" | "forbidden";

/**
 * Who may run a check: anyone with script:execute; otherwise, in demo mode,
 * only a seeded demo check ("demo" access, which is rate limited).
 */
export function runAccess({
  canExecute,
  demoMode,
  scriptAuthor,
}: {
  canExecute: boolean;
  demoMode: boolean;
  scriptAuthor: string | null | undefined;
}): RunAccess {
  if (canExecute) return "allowed";
  if (demoMode && scriptAuthor === DEMO_AUTHOR) return "demo";
  return "forbidden";
}
