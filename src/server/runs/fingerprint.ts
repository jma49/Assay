import { createHash } from "node:crypto";
import { normalizeRow } from "@/domain/run";

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
}

/** A short, order-independent identity for a row: the same row in two runs gets the same key. */
export function fingerprintRow(row: Record<string, unknown>): string {
  return createHash("sha1").update(stableJson(normalizeRow(row))).digest("hex").slice(0, 16);
}

