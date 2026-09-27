import { describe, expect, it, vi } from "vitest";
import type { DeliveryOutcome } from "@/server/notify/types";
import {
  backoffMs,
  dispatchNotifications,
  HOURLY_LIMIT,
  MAX_ATTEMPTS,
  type CheckInfo,
  type ClaimedDelivery,
  type Destination,
  type DispatchDeps,
  type NotifyStore,
  type StoredEvent,
} from "./notifications";

const t0 = new Date("2026-09-26T09:00:00Z");

function destination(overrides: Partial<Destination> = {}): Destination {
  return {
    id: "d1",
    workspaceId: "default",
    kind: "slack",
    name: "Alerts",
    label: "#alerts",
    sealed: JSON.stringify({ url: "https://hooks.slack.com/services/x" }),
    language: "en",
    alerts: ["broken", "issues", "new_rows", "recovered"],
    tags: [],
    enabled: true,
    createdAt: new Date(t0.getTime() - 60_000),
    createdBy: { id: "u1", name: "Ada" },
    ...overrides,
  };
}

function event(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: "e1",
    workspaceId: "default",
    type: "check.outcome_changed",
    checkId: "orders",
    runId: "r1",
    from: "clean",
    to: "issues",
    rowCount: 3,
    diff: null,
    at: t0,
    ...overrides,
  };
}

interface MemoryDelivery {
  id: string;
  eventId: string;
  destinationId: string;
  status: "pending" | "sent" | "failed";
  attempts: number;
  nextAttemptAt: Date;
  claim: string | null;
  sentAt?: Date;
  error?: string;
}

function memoryStore(events: StoredEvent[], destinations: Destination[], checkExtras: Partial<CheckInfo> = {}) {
  const fanned = new Map<string, string | null>();
  const deliveries: MemoryDelivery[] = [];
  let claims = 0;
  const store: NotifyStore = {
    async pendingEvents(since) {
      return events.filter((e) => !fanned.has(e.id) && e.at >= since);
    },
    async checkInfo(ids) {
      return new Map(ids.map((id) => [id, { name: id === "orders" ? "Orders" : id, tags: id === "orders" ? ["finance"] : [], ...checkExtras }]));
    },
    async destinations(workspaceId) {
      return destinations.filter((d) => d.workspaceId === workspaceId);
    },
    async destination(id) {
      return destinations.find((d) => d.id === id) ?? null;
    },
    async event(id) {
      return events.find((e) => e.id === id) ?? null;
    },
    async createDeliveries(list, now) {
      for (const d of list) {
        if (deliveries.some((x) => x.eventId === d.eventId && x.destinationId === d.destinationId)) continue;
        deliveries.push({ id: `${d.eventId}:${d.destinationId}`, ...d, status: "pending", attempts: 0, nextAttemptAt: now, claim: null });
      }
    },
    async markFannedOut(id, _now, suppressed) {
      fanned.set(id, suppressed);
    },
    async claimDelivery(now, leaseMs) {
      const next = deliveries.find((d) => d.status === "pending" && d.nextAttemptAt <= now);
      if (!next) return null;
      next.claim = `c${++claims}`;
      next.nextAttemptAt = new Date(now.getTime() + leaseMs);
      return { id: next.id, eventId: next.eventId, destinationId: next.destinationId, attempts: next.attempts, claim: next.claim };
    },
    async finishDelivery(claimed: ClaimedDelivery, update) {
      const d = deliveries.find((x) => x.id === claimed.id && x.claim === claimed.claim);
      if (!d) return;
      d.status = update.status;
      d.claim = null;
      if (update.status === "sent") d.sentAt = update.at;
      if (update.status !== "sent") {
        if (update.attempted) d.attempts++;
        d.error = update.error;
      }
      if (update.status === "pending") d.nextAttemptAt = update.nextAttemptAt;
    },
    async sentSince(destinationId, since) {
      return deliveries.filter((d) => d.destinationId === destinationId && d.sentAt && d.sentAt >= since).length;
    },
    async recordLastDelivery() {},
    async digestDestinations() {
      return destinations.filter((d) => d.enabled && d.digest?.enabled);
    },
    async claimDigest(id, slot, now) {
      const d = destinations.find((x) => x.id === id)!;
      if ((d.lastDigestAt ?? d.createdAt) >= slot) return false;
      d.lastDigestAt = now;
      return true;
    },
    async digestSummary() {
      return { total: 3, broken: [], issues: [{ name: "Orders", rowCount: 3 }], changes: 1, recovered: 0 };
    },
  };
  return { store, deliveries, fanned };
}

function deps(store: NotifyStore, outcomes: DeliveryOutcome[] = [{ kind: "sent" }], clock = { now: t0 }) {
  const send = vi.fn(async () => outcomes[Math.min(send.mock.calls.length - 1, outcomes.length - 1)]);
  const d: DispatchDeps = {
    store,
    now: () => clock.now,
    send,
    openSecret: (sealed) => JSON.parse(sealed),
    env: {},
    appUrl: "https://assay.example/",
  };
  return { deps: d, send, clock };
}

describe("dispatchNotifications", () => {
  it("sends each event once to each destination that wants it", async () => {
    const { store, deliveries } = memoryStore(
      [event()],
      [destination(), destination({ id: "d2", alerts: ["broken"] }), destination({ id: "d3", tags: ["ops"] }), destination({ id: "d4", enabled: false })],
    );
    const { deps: d, send } = deps(store);
    expect(await dispatchNotifications(d)).toEqual({ queued: 1, sent: 1, retrying: 0, failed: 0, digests: 0 });
    expect(deliveries.map((x) => x.destinationId)).toEqual(["d1"]);
    const request = (send.mock.calls[0] as unknown[])[1] as { body: string };
    expect(request.body).toContain("https://assay.example/checks/orders");

    // Running again (or concurrently) sends nothing more.
    expect(await dispatchNotifications(d)).toEqual({ queued: 0, sent: 0, retrying: 0, failed: 0, digests: 0 });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("never replays events from before a destination existed, or stale ones", async () => {
    const { store, deliveries } = memoryStore(
      [event({ id: "old", at: new Date(t0.getTime() - 120_000) }), event({ id: "stale", at: new Date(t0.getTime() - 25 * 3_600_000) })],
      [destination()],
    );
    await dispatchNotifications(deps(store).deps);
    expect(deliveries).toHaveLength(0);
  });

  it("retries with backoff, then gives up", async () => {
    const { store, deliveries } = memoryStore([event()], [destination()]);
    const { deps: d, send, clock } = deps(store, [{ kind: "retry", error: "HTTP 503" }]);
    await dispatchNotifications(d);
    expect(deliveries[0]).toMatchObject({ status: "pending", attempts: 1, error: "HTTP 503" });
    expect(deliveries[0].nextAttemptAt.getTime() - t0.getTime()).toBe(backoffMs(1));

    // Not due yet: nothing is sent.
    await dispatchNotifications(d);
    expect(send).toHaveBeenCalledTimes(1);

    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      clock.now = new Date(deliveries[0].nextAttemptAt.getTime());
      await dispatchNotifications(d);
    }
    expect(send).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(deliveries[0]).toMatchObject({ status: "failed", attempts: MAX_ATTEMPTS });
  });

  it("honours Retry-After and stops at once on permanent errors", async () => {
    expect(backoffMs(1, 10 * 60_000)).toBe(10 * 60_000);
    const { store, deliveries } = memoryStore([event()], [destination()]);
    await dispatchNotifications(deps(store, [{ kind: "failed", error: "HTTP 404: no_service" }]).deps);
    expect(deliveries[0]).toMatchObject({ status: "failed", attempts: 1, error: "HTTP 404: no_service" });
  });

  it("throttles a destination that already got its hourly share", async () => {
    const events = Array.from({ length: HOURLY_LIMIT + 2 }, (_, i) => event({ id: `e${i}`, runId: `r${i}` }));
    const { store, deliveries } = memoryStore(events, [destination()]);
    const { deps: d, send } = deps(store);
    const report = await dispatchNotifications(d, 100);
    expect(send).toHaveBeenCalledTimes(HOURLY_LIMIT);
    expect(report).toMatchObject({ sent: HOURLY_LIMIT, retrying: 2 });
    expect(deliveries.filter((x) => x.status === "pending").every((x) => x.attempts === 0)).toBe(true);
  });

  it("fails without retrying when the secret cannot be opened", async () => {
    const { store, deliveries } = memoryStore([event()], [destination({ sealed: "not json" })]);
    await dispatchNotifications(deps(store).deps);
    expect(deliveries[0].status).toBe("failed");
  });

  it("uses the Chinese name for Chinese destinations and skips removed ones", async () => {
    const { store } = memoryStore([event()], [destination({ language: "zh" })]);
    const { deps: d, send } = deps(store);
    await dispatchNotifications(d);
    expect(((send.mock.calls[0] as unknown[])[1] as { body: string }).body).toContain("Orders 发现 3 行问题数据");

    const gone = memoryStore([event()], [destination()]);
    const d2 = deps(gone.store).deps;
    d2.store.destination = async () => null;
    await dispatchNotifications(d2);
    expect(gone.deliveries[0]).toMatchObject({ status: "failed", attempts: 0 });
  });

  it("holds alerts back for muted checks and for more rows of an acknowledged problem", async () => {
    const since = new Date(t0.getTime() - 3_600_000);
    const muted = memoryStore([event()], [destination()], { alerting: { mutedUntil: new Date(t0.getTime() + 60_000) } });
    await dispatchNotifications(deps(muted.store).deps);
    expect(muted.deliveries).toHaveLength(0);
    expect(muted.fanned.get("e1")).toBe("muted");

    const ack = { since, by: { id: "u1", name: "Ada" }, at: t0 };
    const acked = memoryStore([event({ type: "check.new_rows", from: "issues" })], [destination()], {
      alerting: { ack },
      state: { since, outcome: "issues" },
    });
    await dispatchNotifications(deps(acked.store).deps);
    expect(acked.deliveries).toHaveLength(0);
    expect(acked.fanned.get("e1")).toBe("acknowledged");

    // A new failure still gets through.
    const broken = memoryStore([event({ to: "error", from: "issues" })], [destination()], { alerting: { ack }, state: { since: t0, outcome: "error" } });
    await dispatchNotifications(deps(broken.store).deps);
    expect(broken.deliveries).toHaveLength(1);
  });

  it("sends the daily summary once per day, from the first slot after the destination was made", async () => {
    const digest = { enabled: true, hour: 9, timeZone: "UTC" };
    // t0 is 09:00 UTC; the destination was made a minute before.
    const { store } = memoryStore([], [destination({ digest, alerts: [] })]);
    const clock = { now: new Date(t0.getTime() + 60_000) };
    const { deps: d, send } = deps(store, [{ kind: "sent" }], clock);
    expect((await dispatchNotifications(d)).digests).toBe(1);
    expect(((send.mock.calls[0] as unknown[])[1] as { body: string }).body).toContain("Daily summary: 1 with issues");

    // Later the same day, and from a second dispatcher: nothing more.
    clock.now = new Date(t0.getTime() + 5 * 3_600_000);
    expect((await dispatchNotifications(d)).digests).toBe(0);
    // The next day's slot.
    clock.now = new Date(t0.getTime() + 24 * 3_600_000 + 60_000);
    expect((await dispatchNotifications(d)).digests).toBe(1);

    // Made after today's slot: waits for tomorrow.
    const late = memoryStore([], [destination({ digest, createdAt: new Date(t0.getTime() + 3_600_000) })]);
    expect((await dispatchNotifications(deps(late.store, [{ kind: "sent" }], { now: new Date(t0.getTime() + 2 * 3_600_000) }).deps)).digests).toBe(0);
  });
});
