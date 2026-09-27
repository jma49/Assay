import type { AlertKind } from "./notify";
import type { CheckState } from "./run";

export interface Actor {
  id: string;
  name: string;
}

/**
 * What people decided about a check's alerts, kept on the check:
 * - owner: who looks after it;
 * - mutedUntil: no alerts until then;
 * - ack: someone is on the current problem. It covers the episode that
 *   began at `since`, so it lapses by itself when the outcome changes.
 */
export interface Alerting {
  owner?: Actor | null;
  mutedUntil?: Date | null;
  mutedBy?: Actor | null;
  ack?: { since: Date; by: Actor; at: Date } | null;
}

export const MUTE_HOURS = [1, 8, 24, 24 * 7] as const;
export const MAX_MUTE_HOURS = 24 * 30;

export function isMuted(alerting: Alerting | null | undefined, now: Date): boolean {
  return Boolean(alerting?.mutedUntil && new Date(alerting.mutedUntil) > now);
}

/** Whether the acknowledgement is for the check's current problem, not an earlier one. */
export function isAcknowledged(alerting: Alerting | null | undefined, state: Pick<CheckState, "since" | "outcome"> | null | undefined): boolean {
  if (!alerting?.ack || !state || state.outcome === "clean") return false;
  return new Date(alerting.ack.since).getTime() === new Date(state.since).getTime();
}

export type Suppression = "muted" | "acknowledged";

/**
 * Why an alert should not be sent, if it should not. Muting silences
 * everything; an acknowledgement only silences more rows for the problem
 * someone is already on, so a new failure or a recovery still gets through.
 */
export function suppressionFor(
  kind: AlertKind,
  alerting: Alerting | null | undefined,
  state: Pick<CheckState, "since" | "outcome"> | null | undefined,
  now: Date,
): Suppression | null {
  if (isMuted(alerting, now)) return "muted";
  if (kind === "new_rows" && isAcknowledged(alerting, state)) return "acknowledged";
  return null;
}
