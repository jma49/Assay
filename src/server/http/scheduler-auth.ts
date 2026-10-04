import { Receiver } from "@upstash/qstash";
import { safeEqual } from "@/server/crypto/secret-box";

type Env = Record<string, string | undefined>;

/**
 * Whether a request to a scheduler-only endpoint comes from a trusted
 * scheduler: a valid QStash signature for exactly `url`, or the CRON_SECRET
 * bearer token (GitHub Actions, any other cron, a manual curl).
 */
export async function isTrustedScheduler(request: Request, rawBody: string, url: string, env: Env = process.env): Promise<boolean> {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (bearer && env.CRON_SECRET && safeEqual(bearer, env.CRON_SECRET)) return true;

  const signature = request.headers.get("upstash-signature");
  const currentSigningKey = env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = env.QSTASH_NEXT_SIGNING_KEY;
  if (!signature || !currentSigningKey || !nextSigningKey) return false;
  // devMode is off on purpose: left to the SDK, QSTASH_DEV=true would switch
  // verification to QStash's public development keys.
  const receiver = new Receiver({ currentSigningKey, nextSigningKey, devMode: false });
  try {
    return await receiver.verify({ signature, body: rawBody, url, clockTolerance: 5 });
  } catch {
    return false;
  }
}
