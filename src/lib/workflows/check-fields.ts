import { isReservedAuthor } from "@/lib/security/demo-sandbox";

/** What people may set on a check. Everything else (state, lease, alerting, demoSeed, …) is the server's. */
export const EDITABLE_CHECK_FIELDS = [
  "name",
  "cnName",
  "description",
  "cnDescription",
  "scope",
  "cnScope",
  "author",
  "hashtags",
  "sqlContent",
  "isScheduled",
  "cronSchedule",
] as const;

/** Only the editable fields of a payload, e.g. one stored on an approval request. */
export function pickEditable(data: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const field of EDITABLE_CHECK_FIELDS) {
    if (data && data[field] !== undefined) picked[field] = data[field];
  }
  return picked;
}

export interface Actor {
  id: string;
  email: string;
}

/** Why an author label cannot be used, or null. It is a display label only; ownership is createdBy. */
export function authorProblem(author: unknown): string | null {
  if (author === undefined || author === null || author === "") return null;
  if (typeof author !== "string" || author.length > 80) return "author must be text of at most 80 characters";
  if (isReservedAuthor(author)) return "This author name is reserved";
  return null;
}

/**
 * Whether the person owns the check. Checks record who created them
 * (createdBy); older ones only have the author label, compared with the
 * email's local part as before.
 */
export function ownsCheck(check: Record<string, unknown>, actor: Actor): boolean {
  const createdBy = check.createdBy as { id?: unknown } | null | undefined;
  if (typeof createdBy?.id === "string") return createdBy.id === actor.id;
  return typeof check.author === "string" && check.author !== "" && check.author === actor.email.split("@")[0];
}

/**
 * Checks carry a version that every edit increments. A save states the
 * version it started from; if someone saved in between, the filter matches
 * nothing and the save is refused instead of overwriting their change.
 * Checks from before versions have none, which counts as 0.
 */
export function versionFilter(expected: number | undefined): Record<string, unknown> {
  if (expected === undefined) return {};
  return expected === 0 ? { $or: [{ version: { $exists: false } }, { version: 0 }] } : { version: expected };
}

/** The version a client sent: a whole number ≥ 0, or undefined when it sent none. */
export function readVersion(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}
