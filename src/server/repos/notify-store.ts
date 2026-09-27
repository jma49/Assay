import { randomUUID } from "node:crypto";
import { ObjectId, type Db, type Document } from "mongodb";
import { DEFAULT_WORKSPACE_ID } from "@/domain/workspace";
import type { Destination, NotifyStore, StoredEvent } from "@/server/services/notifications";

export const DESTINATIONS = "notification_destinations";
export const DELIVERIES = "notification_deliveries";

const DUPLICATE_KEY = 11000;

const toId = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

export function toDestination(doc: Document): Destination {
  return {
    id: String(doc._id),
    workspaceId: doc.workspaceId ?? DEFAULT_WORKSPACE_ID,
    kind: doc.kind,
    name: doc.name,
    label: doc.label ?? "",
    sealed: doc.sealed,
    language: doc.language === "zh" ? "zh" : "en",
    alerts: doc.alerts ?? [],
    tags: doc.tags ?? [],
    enabled: doc.enabled !== false,
    createdAt: new Date(doc.createdAt),
    createdBy: doc.createdBy ?? { id: "", name: "" },
    lastDelivery: doc.lastDelivery ?? null,
  };
}

export function toStoredEvent(doc: Document): StoredEvent {
  return {
    id: String(doc._id),
    workspaceId: doc.workspaceId ?? DEFAULT_WORKSPACE_ID,
    type: doc.type,
    checkId: doc.checkId,
    runId: doc.runId,
    from: doc.from ?? null,
    to: doc.to,
    rowCount: doc.rowCount ?? 0,
    diff: doc.diff ?? null,
    error: doc.error ?? null,
    at: new Date(doc.at),
    suppressed: doc.suppressed ?? null,
  };
}

export function mongoNotifyStore(db: Db): NotifyStore {
  const events = db.collection("events");
  const checks = db.collection("sql_scripts");
  const destinations = db.collection(DESTINATIONS);
  const deliveries = db.collection(DELIVERIES);

  return {
    async pendingEvents(since, limit) {
      const docs = await events
        .find({ at: { $gte: since }, fannedOutAt: { $exists: false } })
        .sort({ at: 1 })
        .limit(limit)
        .toArray();
      return docs.map(toStoredEvent);
    },

    async checkInfo(checkIds) {
      const docs = await checks
        .find(
          { scriptId: { $in: checkIds } },
          { projection: { scriptId: 1, name: 1, cnName: 1, hashtags: 1, alerting: 1, "state.since": 1, "state.outcome": 1 } },
        )
        .toArray();
      return new Map(
        docs.map((doc) => [
          String(doc.scriptId),
          {
            name: String(doc.name ?? doc.scriptId),
            cnName: doc.cnName || undefined,
            tags: Array.isArray(doc.hashtags) ? doc.hashtags : [],
            alerting: doc.alerting ?? null,
            state: doc.state ?? null,
          },
        ]),
      );
    },

    async destinations(workspaceId) {
      const filter = workspaceId === DEFAULT_WORKSPACE_ID ? { workspaceId: { $in: [workspaceId, null] } } : { workspaceId };
      return (await destinations.find(filter).toArray()).map(toDestination);
    },

    async destination(id) {
      const _id = toId(id);
      const doc = _id ? await destinations.findOne({ _id }) : null;
      return doc ? toDestination(doc) : null;
    },

    async event(id) {
      const _id = toId(id);
      const doc = _id ? await events.findOne({ _id }) : null;
      return doc ? toStoredEvent(doc) : null;
    },

    async createDeliveries(list, now) {
      if (list.length === 0) return;
      try {
        await deliveries.insertMany(
          list.map((d) => ({ ...d, status: "pending", attempts: 0, nextAttemptAt: now, claim: null, createdAt: now })),
          { ordered: false },
        );
      } catch (error) {
        // Another dispatcher fanned the same event out first; its deliveries stand.
        const writeErrors = (error as { writeErrors?: { code: number }[] }).writeErrors ?? [];
        if (writeErrors.length === 0 || writeErrors.some((e) => e.code !== DUPLICATE_KEY)) throw error;
      }
    },

    async markFannedOut(eventId, now, suppressed) {
      const _id = toId(eventId);
      if (_id) await events.updateOne({ _id }, { $set: { fannedOutAt: now, ...(suppressed && { suppressed }) } });
    },

    async claimDelivery(now, leaseMs) {
      const claim = randomUUID();
      const doc = await deliveries.findOneAndUpdate(
        { status: "pending", nextAttemptAt: { $lte: now } },
        { $set: { claim, nextAttemptAt: new Date(now.getTime() + leaseMs) } },
        { sort: { nextAttemptAt: 1 }, returnDocument: "after" },
      );
      if (!doc) return null;
      return { id: String(doc._id), eventId: doc.eventId, destinationId: doc.destinationId, attempts: doc.attempts ?? 0, claim };
    },

    async finishDelivery(delivery, update) {
      const set: Document = { status: update.status, claim: null, updatedAt: update.at };
      if (update.status === "sent") set.sentAt = update.at;
      if (update.status === "pending") set.nextAttemptAt = update.nextAttemptAt;
      if (update.status !== "sent" && update.error) set.lastError = update.error;
      const inc = update.status !== "sent" && !update.attempted ? {} : { attempts: 1 };
      await deliveries.updateOne({ _id: new ObjectId(delivery.id), claim: delivery.claim }, { $set: set, $inc: inc });
    },

    async sentSince(destinationId, since) {
      return deliveries.countDocuments({ destinationId, sentAt: { $gte: since } });
    },

    async recordLastDelivery(destinationId, result) {
      const _id = toId(destinationId);
      if (_id) await destinations.updateOne({ _id }, { $set: { lastDelivery: result } });
    },
  };
}
