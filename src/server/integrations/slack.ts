import { createHmac } from "node:crypto";
import { safeEqual } from "@/server/crypto/secret-box";

const MAX_SKEW_SECONDS = 5 * 60;

/**
 * Slack's request signature: v0=HMAC-SHA256(signing secret, "v0:<ts>:<body>").
 * Old timestamps are refused so a captured request cannot be replayed.
 */
export function verifySlackSignature(
  body: string,
  timestamp: string | null,
  signature: string | null,
  secret: string | undefined,
  now = Date.now(),
): boolean {
  if (!secret || !timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > MAX_SKEW_SECONDS) return false;
  const expected = `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex")}`;
  return safeEqual(expected, signature);
}

interface Block {
  type: string;
  elements?: { action_id?: string; [key: string]: unknown }[];
  [key: string]: unknown;
}

/**
 * The alert after someone acted on it: the Acknowledge and Mute buttons go
 * (the Open button stays) and a line says who did what.
 */
export function blocksAfterAction(blocks: Block[] | undefined, note: string): Block[] {
  const kept = (blocks ?? [])
    .map((block) =>
      block.type === "actions" ? { ...block, elements: (block.elements ?? []).filter((e) => !e.action_id || e.action_id === "assay_open") } : block,
    )
    .filter((block) => block.type !== "actions" || (block.elements?.length ?? 0) > 0)
    .filter((block) => block.type !== "context" || !String(JSON.stringify(block)).includes("assay-note"));
  return [...kept, { type: "context", block_id: "assay-note", elements: [{ type: "mrkdwn", text: note }] }];
}
