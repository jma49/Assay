import { randomUUID } from "node:crypto";
import { ObjectId, type Db, type Document } from "mongodb";
import { DEFAULT_WORKSPACE_ID } from "@/domain/workspace";
import type { Destination, NotifyStore, StoredEvent } from "@/server/services/notifications";
import { COLLECTIONS } from "@/lib/database/collections";

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
    digest: doc.digest ?? null,
    lastDigestAt: doc.lastDigestAt ? new Date(doc.lastDigestAt) : null,
    source: doc.source ?? "paste",
    remind: doc.remind ?? null,
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
    actionKey: doc.actionKey ?? null,
  };
}

export function mongoNotifyStore(db: Db): NotifyStore {
  const events = db.collection(COLLECTIONS.events);
  const checks = db.collection(COLLECTIONS.checks);
  const destinations = db.collection(COLLECTIONS.notificationDestinations);
  const deliveries = db.collection(COLLECTIONS.notificationDeliveries);
  const reminders = db.collection(COLLECTIONS.notificationReminders);

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
          list.map((d) => ({ ...d, status: "pending", attempts: 0, nextAttemptAt: now, claim: null, createdAt: now, updatedAt: now })),
          { ordered: false },
        );
      } catch (error) {
        // Another dispatcher fanned the same event out first; its deliveries stand.
        const writeErrors = (error as { writeErrors?: { code: number }[] }).writeErrors ?? [];
        if (writeErrors.length === 0 || writeErrors.some((e) => e.code !== DUPLICATE_KEY)) throw error;
      }
    },

    async assignActionKey(eventId, actionKey) {
      const _id = toId(eventId);
      if (_id) await events.updateOne({ _id, actionKey: { $exists: false } }, { $set: { actionKey } });
    },

    async markFannedOut(eventId, now, suppressed) {
      const _id = toId(eventId);
      if (_id) await events.updateOne({ _id }, { $set: { fannedOutAt: now, ...(suppressed && { suppressed }) } });
    },

    async claimDelivery(now, leaseMs) {
      const claim = randomUUID();
      const doc = await deliveries.findOneAndUpdate(
        { status: "pending", nextAttemptAt: { $lte: now } },
        { $set: { claim, nextAttemptAt: new Date(now.getTime() + leaseMs), updatedAt: now } },
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

    async failedDeliveries(workspaceId, limit) {
      const docs = await deliveries.find({ workspaceId, status: "failed" }).sort({ updatedAt: -1 }).limit(limit).toArray();
      const objectIds = (values: string[]) => {
        const ids: ObjectId[] = [];
        for (const value of new Set(values)) {
          const id = toId(value);
          if (id) ids.push(id);
        }
        return ids;
      };
      const [destinationDocs, eventDocs] = await Promise.all([
        destinations.find({ _id: { $in: objectIds(docs.map((d) => String(d.destinationId))) } }).toArray(),
        events.find({ _id: { $in: objectIds(docs.map((d) => String(d.eventId))) } }).toArray(),
      ]);
      const byDestination = new Map(destinationDocs.map((d) => [String(d._id), toDestination(d)]));
      const byEvent = new Map(eventDocs.map((d) => [String(d._id), toStoredEvent(d)]));
      return docs.map((doc) => {
        const destination = byDestination.get(String(doc.destinationId));
        const event = byEvent.get(String(doc.eventId));
        return {
          id: String(doc._id),
          eventId: String(doc.eventId),
          checkId: event?.checkId ?? "",
          destinationId: String(doc.destinationId),
          destinationName: destination?.name ?? "",
          attempts: typeof doc.attempts === "number" ? doc.attempts : 0,
          lastError: typeof doc.lastError === "string" ? doc.lastError : null,
          failedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(doc.createdAt),
        };
      });
    },

    async requeueDelivery(workspaceId, id) {
      const _id = toId(id);
      if (!_id) return false;
      const now = new Date();
      const result = await deliveries.updateOne(
        { _id, workspaceId, status: "failed" },
        { $set: { status: "pending", attempts: 0, nextAttemptAt: now, updatedAt: now, claim: null, lastError: null } },
      );
      return result.modifiedCount === 1;
    },

    async takeSendSlot(destinationId, now, limit) {
      const _id = toId(destinationId);
      if (!_id) return false;
      // The destination keeps the times of its sends in the last hour. One
      // conditional update both checks the count and records the send, so
      // no two dispatchers can take the last slot.
      const since = new Date(now.getTime() - 3_600_000);
      const recent = { $filter: { input: { $ifNull: ["$recentSends", []] }, cond: { $gte: ["$$this", since] } } };
      const result = await destinations.updateOne(
        { _id, $expr: { $lt: [{ $size: recent }, limit] } },
        [{ $set: { recentSends: { $concatArrays: [recent, [now]] } } }],
      );
      return result.modifiedCount === 1;
    },

    async digestDestinations() {
      return (await destinations.find({ enabled: { $ne: false }, "digest.enabled": true }).toArray()).map(toDestination);
    },

    async claimDigest(destinationId, slot, now) {
      const _id = toId(destinationId);
      if (!_id) return false;
      const result = await destinations.updateOne(
        { _id, $or: [{ lastDigestAt: { $lt: slot } }, { lastDigestAt: null, createdAt: { $lt: slot } }] },
        { $set: { lastDigestAt: now } },
      );
      return result.modifiedCount === 1;
    },

    async digestSummary(workspaceId, tags, since) {
      // Checks carry no workspaceId yet; they all belong to the default workspace.
      const checkFilter = tags.length ? { hashtags: { $in: [...tags] } } : {};
      const docs = workspaceId === DEFAULT_WORKSPACE_ID
        ? await checks.find(checkFilter, { projection: { scriptId: 1, name: 1, cnName: 1, state: 1 } }).toArray()
        : [];
      const broken = docs.filter((d) => d.state?.outcome === "error").map((d) => ({ name: String(d.name ?? d.scriptId) }));
      const issues = docs
        .filter((d) => d.state?.outcome === "issues")
        .map((d) => ({ name: String(d.name ?? d.scriptId), rowCount: Number(d.state.rowCount ?? 0) }))
        .sort((a, b) => b.rowCount - a.rowCount);
      const ids = docs.map((d) => String(d.scriptId));
      const recent = await events
        .find({ checkId: { $in: ids }, at: { $gte: since } }, { projection: { to: 1 } })
        .toArray();
      return { total: docs.length, broken, issues, changes: recent.length, recovered: recent.filter((e) => e.to === "clean").length };
    },

    async reminderDestinations() {
      return (await destinations.find({ enabled: { $ne: false }, "remind.afterHours": { $gt: 0 } }).toArray()).map(toDestination);
    },

    async openProblems(workspaceId, tags) {
      // Checks carry no workspaceId yet; they all belong to the default workspace.
      if (workspaceId !== DEFAULT_WORKSPACE_ID) return [];
      const docs = await checks
        .find(
          { "state.outcome": { $in: ["error", "issues"] }, ...(tags.length ? { hashtags: { $in: [...tags] } } : {}) },
          { projection: { scriptId: 1, name: 1, cnName: 1, state: 1, alerting: 1 } },
        )
        .toArray();
      return docs.map((doc) => ({
        checkId: String(doc.scriptId),
        name: String(doc.name ?? doc.scriptId),
        cnName: doc.cnName || undefined,
        outcome: doc.state.outcome,
        rowCount: Number(doc.state.rowCount ?? 0),
        since: new Date(doc.state.since),
        alerting: doc.alerting ?? null,
      }));
    },

    async remindersSent(destinationId, checkId, since) {
      return (await reminders.findOne({ destinationId, checkId, since }, { projection: { sent: 1 } }))?.sent ?? 0;
    },

    async claimReminder(destinationId, checkId, since, sent, now) {
      if (sent === 0) {
        try {
          await reminders.insertOne({ destinationId, checkId, since, sent: 1, lastAt: now });
          return true;
        } catch (error) {
          if ((error as { code?: number }).code === DUPLICATE_KEY) return false;
          throw error;
        }
      }
      const result = await reminders.updateOne({ destinationId, checkId, since, sent }, { $inc: { sent: 1 }, $set: { lastAt: now } });
      return result.modifiedCount === 1;
    },

    async releaseReminder(destinationId, checkId, since, sent) {
      // Only while the count is still ours, so a later claim by another dispatcher is never undone.
      if (sent <= 1) await reminders.deleteOne({ destinationId, checkId, since, sent: 1 });
      else await reminders.updateOne({ destinationId, checkId, since, sent }, { $inc: { sent: -1 } });
    },

    async problemToken(checkId, since) {
      const event = await events.findOne(
        { checkId, at: { $gte: since }, actionKey: { $exists: true } },
        { sort: { at: -1 }, projection: { actionKey: 1 } },
      );
      return event ? `${String(event._id)}.${event.actionKey}` : null;
    },

    async recordLastDelivery(destinationId, result) {
      const _id = toId(destinationId);
      if (_id) await destinations.updateOne({ _id }, { $set: { lastDelivery: result } });
    },
  };
}
