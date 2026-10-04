/**
 * The public demo lets viewers run the sample checks, so visitors can see a
 * check find problems without being given the developer role. It is off
 * unless DEMO_MODE=true on the server, only covers checks the demo seed
 * marked with `demoSeed: true` (a field no API writes), and is rate limited.
 */
const DEMO_AUTHOR = "demo-seed";

/**
 * Whether an author label is reserved for the demo seed. The label is only
 * shown, never trusted, but taking it would still pass a check off as a sample.
 */
export function isReservedAuthor(author: unknown): boolean {
  return typeof author === "string" && author.trim().toLowerCase() === DEMO_AUTHOR;
}
export const DEMO_RUNS_PER_HOUR = 20;

export function isDemoMode(env: Record<string, string | undefined> = process.env): boolean {
  return env.DEMO_MODE === "true";
}

export type RunAccess = "allowed" | "demo" | "forbidden";

/**
 * Who may run a check: anyone with check:execute; otherwise, in demo mode,
 * only a seeded demo check ("demo" access, which is rate limited).
 */
export function runAccess({
  canExecute,
  demoMode,
  demoSeed,
}: {
  canExecute: boolean;
  demoMode: boolean;
  demoSeed: unknown;
}): RunAccess {
  if (canExecute) return "allowed";
  if (demoMode && demoSeed === true) return "demo";
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

/** Proxies in front of a self-hosted server that append to x-forwarded-for, when TRUSTED_PROXY_COUNT is unset. */
const DEFAULT_TRUSTED_PROXY_COUNT = 1;

function trustedProxyCount(env: Record<string, string | undefined>): number {
  const raw = env.TRUSTED_PROXY_COUNT?.trim();
  if (!raw) return DEFAULT_TRUSTED_PROXY_COUNT;
  const count = Number(raw);
  return Number.isInteger(count) && count >= 0 ? count : DEFAULT_TRUSTED_PROXY_COUNT;
}

/**
 * The client address, for the guest demo quota. On Vercel the edge sets
 * x-vercel-forwarded-for and x-real-ip itself, overwriting what the client
 * sent. Elsewhere only the proxies' own entries in x-forwarded-for can be
 * trusted: each appends the address it saw, so with N trusted proxies the
 * client is the Nth entry from the right, and anything to its left may be
 * made up by the client. With TRUSTED_PROXY_COUNT=0 no header is trusted.
 */
export function clientIp(headers: Headers, env: Record<string, string | undefined> = process.env): string {
  const first = (value: string | null) => value?.split(",")[0]?.trim() || null;
  if (env.VERCEL) {
    return first(headers.get("x-vercel-forwarded-for")) || first(headers.get("x-real-ip")) || first(headers.get("x-forwarded-for")) || "unknown";
  }
  const proxies = trustedProxyCount(env);
  if (proxies === 0) return "unknown";
  const hops = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  // Fewer entries than proxies: the left-most is still one a trusted proxy wrote.
  return hops[Math.max(0, hops.length - proxies)] || "unknown";
}
