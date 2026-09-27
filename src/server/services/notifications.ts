import { digestSlot, type DigestSettings, type DigestSummary } from "@/domain/digest";
import {
  alertKindOf,
  buildAlertMessage,
  buildDigestMessage,
  wantsAlert,
  type AlertKind,
  type ChannelKind,
  type MessageLanguage,
} from "@/domain/notify";
import { suppressionFor, type Alerting, type Suppression } from "@/domain/alerting";
import type { CheckState, RowDiff, RunOutcome } from "@/domain/run";
import { CHANNELS } from "@/server/notify/channels";
import type { DeliveryOutcome, DestinationSecret, OutgoingRequest, Channel } from "@/server/notify/types";

/** Where alerts go: one channel, with what it wants to hear about. */
export interface Destination {
  id: string;
  workspaceId: string;
  kind: ChannelKind;
  name: string;
  /** Safe to show: a channel name or a masked URL. */
  label: string;
  /** The DestinationSecret, sealed. */
  sealed: string;
  language: MessageLanguage;
  alerts: AlertKind[];
  /** Only checks with one of these tags; empty means every check. */
  tags: string[];
  enabled: boolean;
  createdAt: Date;
  createdBy: { id: string; name: string };
  lastDelivery?: { at: Date; ok: boolean; error?: string } | null;
  digest?: DigestSettings | null;
  lastDigestAt?: Date | null;
}

export interface StoredEvent {
  id: string;
  workspaceId: string;
  type: "check.outcome_changed" | "check.new_rows";
  checkId: string;
  runId: string;
  from: RunOutcome | null;
  to: RunOutcome;
  rowCount: number;
  diff: RowDiff | null;
  error?: string | null;
  at: Date;
  suppressed?: Suppression | null;
}

export interface CheckInfo {
  name: string;
  cnName?: string;
  tags: string[];
  alerting?: Alerting | null;
  state?: Pick<CheckState, "since" | "outcome"> | null;
}

export interface ClaimedDelivery {
  id: string;
  eventId: string;
  destinationId: string;
  attempts: number;
  claim: string;
}

export type DeliveryUpdate =
  | { status: "sent"; at: Date }
  | { status: "failed"; at: Date; error: string; attempted: boolean }
  | { status: "pending"; at: Date; nextAttemptAt: Date; error?: string; attempted: boolean };

export interface NotifyStore {
  /** Recent events not yet turned into deliveries. */
  pendingEvents(since: Date, limit: number): Promise<StoredEvent[]>;
  checkInfo(checkIds: string[]): Promise<Map<string, CheckInfo>>;
  destinations(workspaceId: string): Promise<Destination[]>;
  destination(id: string): Promise<Destination | null>;
  event(id: string): Promise<StoredEvent | null>;
  /** Idempotent: one delivery per event and destination. */
  createDeliveries(deliveries: { eventId: string; destinationId: string; workspaceId: string }[], now: Date): Promise<void>;
  /** Records that the event was handled, and why it went nowhere if it was held back. */
  markFannedOut(eventId: string, now: Date, suppressed: Suppression | null): Promise<void>;
  /** Atomically takes the next due delivery for `leaseMs`, so no two dispatchers send it. */
  claimDelivery(now: Date, leaseMs: number): Promise<ClaimedDelivery | null>;
  /** Applies the update only while the claim is still this dispatcher's. */
  finishDelivery(delivery: ClaimedDelivery, update: DeliveryUpdate): Promise<void>;
  sentSince(destinationId: string, since: Date): Promise<number>;
  recordLastDelivery(destinationId: string, result: { at: Date; ok: boolean; error?: string }): Promise<void>;
  /** Enabled destinations with a daily summary, in every workspace. */
  digestDestinations(): Promise<Destination[]>;
  /** Atomically marks the digest for `slot` as taken; false when another dispatcher already sent it. */
  claimDigest(destinationId: string, slot: Date, now: Date): Promise<boolean>;
  digestSummary(workspaceId: string, tags: readonly string[], since: Date): Promise<DigestSummary>;
}

export interface DispatchDeps {
  store: NotifyStore;
  now: () => Date;
  send: (channel: Channel, request: OutgoingRequest) => Promise<DeliveryOutcome>;
  openSecret: (sealed: string) => DestinationSecret;
  env: Record<string, string | undefined>;
  appUrl: string;
}

/** Events older than this are history, not news; a new destination never replays them. */
export const EVENT_FRESHNESS_MS = 24 * 60 * 60 * 1000;
const LEASE_MS = 2 * 60 * 1000;
export const MAX_ATTEMPTS = 6;
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000, 6 * 3_600_000];
/** Per destination, so a flapping check cannot flood a channel. */
export const HOURLY_LIMIT = 30;
const THROTTLE_DELAY_MS = 10 * 60 * 1000;

export function backoffMs(attempts: number, retryAfterMs?: number): number {
  const base = BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)];
  return Math.max(base, retryAfterMs ?? 0);
}

export function checkUrl(appUrl: string, checkId: string): string {
  return `${appUrl.replace(/\/+$/, "")}/checks/${encodeURIComponent(checkId)}`;
}

/** Turns new events into one delivery per destination that wants them. */
async function fanOut(deps: DispatchDeps): Promise<number> {
  const now = deps.now();
  const events = await deps.store.pendingEvents(new Date(now.getTime() - EVENT_FRESHNESS_MS), 200);
  if (events.length === 0) return 0;
  const checks = await deps.store.checkInfo([...new Set(events.map((e) => e.checkId))]);
  const destinationsByWorkspace = new Map<string, Destination[]>();
  let created = 0;
  for (const event of events) {
    let destinations = destinationsByWorkspace.get(event.workspaceId);
    if (!destinations) {
      destinations = await deps.store.destinations(event.workspaceId);
      destinationsByWorkspace.set(event.workspaceId, destinations);
    }
    const kind = alertKindOf(event);
    const check = checks.get(event.checkId);
    const suppressed = suppressionFor(kind, check?.alerting, check?.state, now);
    const targets = suppressed
      ? []
      : destinations.filter((d) => d.enabled && d.createdAt <= event.at && wantsAlert(d, kind, check?.tags ?? []));
    if (targets.length > 0) {
      await deps.store.createDeliveries(
        targets.map((d) => ({ eventId: event.id, destinationId: d.id, workspaceId: event.workspaceId })),
        now,
      );
      created += targets.length;
    }
    await deps.store.markFannedOut(event.id, now, suppressed);
  }
  return created;
}

async function deliver(delivery: ClaimedDelivery, deps: DispatchDeps): Promise<DeliveryUpdate> {
  const now = deps.now();
  const [destination, event] = await Promise.all([deps.store.destination(delivery.destinationId), deps.store.event(delivery.eventId)]);
  if (!destination || !event) return { status: "failed", at: now, error: "The destination or event no longer exists", attempted: false };
  if (!destination.enabled) return { status: "failed", at: now, error: "The destination is paused", attempted: false };
  if ((await deps.store.sentSince(destination.id, new Date(now.getTime() - 3_600_000))) >= HOURLY_LIMIT) {
    return { status: "pending", at: now, nextAttemptAt: new Date(now.getTime() + THROTTLE_DELAY_MS), attempted: false };
  }

  const check = (await deps.store.checkInfo([event.checkId])).get(event.checkId);
  const name = (destination.language === "zh" ? check?.cnName || check?.name : check?.name) ?? event.checkId;
  const message = buildAlertMessage(event, { name }, { language: destination.language, url: checkUrl(deps.appUrl, event.checkId) });
  const channel = CHANNELS[destination.kind];
  let outcome: DeliveryOutcome;
  try {
    outcome = await deps.send(channel, channel.request(message, deps.openSecret(destination.sealed), { now, env: deps.env }));
  } catch (error) {
    // A secret that no longer opens (rotated key) or a missing bot token: retrying will not fix it.
    outcome = { kind: "failed", error: error instanceof Error ? error.message : String(error) };
  }

  const at = deps.now();
  await deps.store.recordLastDelivery(destination.id, { at, ok: outcome.kind === "sent", error: outcome.kind === "sent" ? undefined : outcome.error });
  if (outcome.kind === "sent") return { status: "sent", at };
  const attempts = delivery.attempts + 1;
  if (outcome.kind === "failed" || attempts >= MAX_ATTEMPTS) {
    return { status: "failed", at, error: outcome.error, attempted: true };
  }
  return {
    status: "pending",
    at,
    error: outcome.error,
    nextAttemptAt: new Date(at.getTime() + backoffMs(attempts, outcome.retryAfterMs)),
    attempted: true,
  };
}

export interface DispatchReport {
  queued: number;
  sent: number;
  retrying: number;
  failed: number;
  digests: number;
}

/**
 * Sends each destination's daily summary once its hour has come. The claim
 * moves lastDigestAt forward first, so a digest is sent at most once per
 * day even with several dispatchers; one that fails is not retried until
 * the next day.
 */
async function sendDigests(deps: DispatchDeps): Promise<number> {
  const now = deps.now();
  let sent = 0;
  for (const destination of await deps.store.digestDestinations()) {
    const digest = destination.digest!;
    const slot = digestSlot(now, digest.hour, digest.timeZone);
    // A new destination starts with the next slot, not one that passed before it existed.
    const last = destination.lastDigestAt ?? destination.createdAt;
    if (last >= slot) continue;
    if (!(await deps.store.claimDigest(destination.id, slot, now))) continue;

    const summary = await deps.store.digestSummary(destination.workspaceId, destination.tags, new Date(now.getTime() - EVENT_FRESHNESS_MS));
    const message = buildDigestMessage(summary, { language: destination.language, url: `${deps.appUrl.replace(/\/+$/, "")}/checks`, at: now });
    const channel = CHANNELS[destination.kind];
    let outcome: DeliveryOutcome;
    try {
      outcome = await deps.send(channel, channel.request(message, deps.openSecret(destination.sealed), { now, env: deps.env }));
    } catch (error) {
      outcome = { kind: "failed", error: error instanceof Error ? error.message : String(error) };
    }
    await deps.store.recordLastDelivery(destination.id, { at: deps.now(), ok: outcome.kind === "sent", error: outcome.kind === "sent" ? undefined : outcome.error });
    if (outcome.kind === "sent") sent++;
  }
  return sent;
}

/**
 * The notification outbox. Safe to run anywhere and any number of times at
 * once: deliveries are unique per event and destination, and each is
 * claimed atomically before it is sent. Delivery is at least once: a
 * dispatcher that dies after sending but before recording may send again.
 */
export async function dispatchNotifications(deps: DispatchDeps, maxSends = 50): Promise<DispatchReport> {
  const report: DispatchReport = { queued: await fanOut(deps), sent: 0, retrying: 0, failed: 0, digests: 0 };
  for (let i = 0; i < maxSends; i++) {
    const delivery = await deps.store.claimDelivery(deps.now(), LEASE_MS);
    if (!delivery) break;
    const update = await deliver(delivery, deps);
    await deps.store.finishDelivery(delivery, update);
    if (update.status === "sent") report.sent++;
    else if (update.status === "failed") report.failed++;
    else report.retrying++;
  }
  report.digests = await sendDigests(deps);
  return report;
}
