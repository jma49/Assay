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

/** All guests together, so rotating addresses cannot run the demo database hot. */
export const GUEST_RUNS_PER_HOUR_TOTAL = 200;

/**
 * The budgets a demo run counts against. A signed-up viewer is limited per
 * account; a guest, whose cookie is free to replace, per IP address and
 * against a shared cap for all guests.
 */
export function demoRunBudgets(
  caller: { id: string; isGuest: boolean },
  ip: string,
): { subject: string; limit: number }[] {
  if (!caller.isGuest) return [{ subject: caller.id, limit: DEMO_RUNS_PER_HOUR }];
  return [
    { subject: `ip:${ip}`, limit: DEMO_RUNS_PER_HOUR },
    { subject: "guests", limit: GUEST_RUNS_PER_HOUR_TOTAL },
  ];
}

/** The client address as the platform reports it; Vercel sets x-forwarded-for itself. */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
