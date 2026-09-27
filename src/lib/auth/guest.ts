import { isDemoMode } from "@/lib/security/demo-sandbox";

/**
 * Guests try the public demo without an account. A guest can do less than
 * a signed-up viewer (read, and run the seeded checks under an IP budget),
 * and sign-up is public anyway, so the cookie needs no signature: forging
 * it only grants what anyone can get by signing up. Off unless DEMO_MODE.
 * Edge-safe: the middleware imports it.
 */
export const GUEST_COOKIE = "assay_guest";
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24;

const GUEST_TOKEN = /^[a-f0-9]{32}$/;

export function guestIdFromToken(
  token: string | undefined,
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (!isDemoMode(env) || !token || !GUEST_TOKEN.test(token)) return null;
  return `guest_${token}`;
}

export function newGuestToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const isGuestId = (id: string) => id.startsWith("guest_");
