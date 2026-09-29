import { describe, expect, it, vi } from "vitest";
import { ObjectId, type Db } from "mongodb";
import { mongoNotifyStore, toDestination, toStoredEvent } from "./notify-store";

const NOW = new Date("2026-09-28T12:00:00Z");

/** Collections as vi.fn()s, looked up by name, so a test sets only what it needs. */
function fakeDb(collections: Record<string, Record<string, unknown>>) {
  return { collection: (name: string) => collections[name] ?? {} } as unknown as Db;
}

describe("claimDelivery", () => {
  it("claims the oldest due delivery with a fresh token and pushes its next attempt past the lease", async () => {
    const id = new ObjectId();
    const findOneAndUpdate = vi.fn(async () => ({ _id: id, eventId: "e1", destinationId: "d1", attempts: 2 }));
    const store = mongoNotifyStore(fakeDb({ notification_deliveries: { findOneAndUpdate } }));

    const claimed = await store.claimDelivery(NOW, 60_000);

    const [filter, update, options] = findOneAndUpdate.mock.calls[0] as unknown as [object, { $set: { claim: string; nextAttemptAt: Date } }, object];
    expect(filter).toEqual({ status: "pending", nextAttemptAt: { $lte: NOW } });
    expect(update.$set.nextAttemptAt).toEqual(new Date(NOW.getTime() + 60_000));
    expect(options).toEqual({ sort: { nextAttemptAt: 1 }, returnDocument: "after" });
    expect(claimed).toEqual({ id: String(id), eventId: "e1", destinationId: "d1", attempts: 2, claim: update.$set.claim });
  });

  it("answers null when nothing is due", async () => {
    const store = mongoNotifyStore(fakeDb({ notification_deliveries: { findOneAndUpdate: async () => null } }));
    expect(await store.claimDelivery(NOW, 60_000)).toBeNull();
  });
});

describe("finishDelivery", () => {
  const delivery = { id: new ObjectId().toHexString(), eventId: "e1", destinationId: "d1", attempts: 0, claim: "claim-1" };

  it("only finishes a delivery still under its own claim", async () => {
    const updateOne = vi.fn(async () => ({}));
    await mongoNotifyStore(fakeDb({ notification_deliveries: { updateOne } })).finishDelivery(delivery, { status: "sent", at: NOW });
    const [filter, update] = updateOne.mock.calls[0] as unknown as [object, { $set: object; $inc: object }];
    expect(filter).toEqual({ _id: new ObjectId(delivery.id), claim: "claim-1" });
    expect(update).toEqual({ $set: { status: "sent", claim: null, updatedAt: NOW, sentAt: NOW }, $inc: { attempts: 1 } });
  });

  it("schedules a retry with the error, counting only attempts that reached the service", async () => {
    const updateOne = vi.fn(async () => ({}));
    const store = mongoNotifyStore(fakeDb({ notification_deliveries: { updateOne } }));
    const later = new Date(NOW.getTime() + 300_000);
    await store.finishDelivery(delivery, { status: "pending", at: NOW, nextAttemptAt: later, error: "HTTP 503", attempted: true });
    await store.finishDelivery(delivery, { status: "pending", at: NOW, nextAttemptAt: later, error: "Hourly cap", attempted: false });
    const updates = updateOne.mock.calls.map((call) => (call as unknown as [object, { $set: object; $inc: object }])[1]);
    expect(updates[0]).toEqual({
      $set: { status: "pending", claim: null, updatedAt: NOW, nextAttemptAt: later, lastError: "HTTP 503" },
      $inc: { attempts: 1 },
    });
    expect(updates[1].$inc).toEqual({});
  });
});

describe("createDeliveries", () => {
  const list = [{ eventId: "e1", destinationId: "d1", workspaceId: "default" }];

  it("inserts pending deliveries due now", async () => {
    const insertMany = vi.fn(async () => ({}));
    await mongoNotifyStore(fakeDb({ notification_deliveries: { insertMany } })).createDeliveries(list as never, NOW);
    expect(insertMany).toHaveBeenCalledWith(
      [{ ...list[0], status: "pending", attempts: 0, nextAttemptAt: NOW, claim: null, createdAt: NOW }],
      { ordered: false },
    );
  });

  it("accepts duplicates from a dispatcher that fanned out first, and rethrows anything else", async () => {
    const duplicate = Object.assign(new Error("dup"), { writeErrors: [{ code: 11000 }] });
    const other = Object.assign(new Error("other"), { writeErrors: [{ code: 11000 }, { code: 121 }] });
    await expect(
      mongoNotifyStore(fakeDb({ notification_deliveries: { insertMany: async () => Promise.reject(duplicate) } })).createDeliveries(list as never, NOW),
    ).resolves.toBeUndefined();
    await expect(
      mongoNotifyStore(fakeDb({ notification_deliveries: { insertMany: async () => Promise.reject(other) } })).createDeliveries(list as never, NOW),
    ).rejects.toThrow("other");
  });
});

describe("reminders", () => {
  it("claims the first reminder by inserting it, losing to a concurrent insert", async () => {
    const insertOne = vi.fn(async () => ({}));
    const store = mongoNotifyStore(fakeDb({ notification_reminders: { insertOne } }));
    expect(await store.claimReminder("d1", "orders", NOW, 0, NOW)).toBe(true);
    const lost = mongoNotifyStore(fakeDb({ notification_reminders: { insertOne: async () => Promise.reject({ code: 11000 }) } }));
    expect(await lost.claimReminder("d1", "orders", NOW, 0, NOW)).toBe(false);
  });

  it("claims a later reminder only from the count it read", async () => {
    const updateOne = vi.fn(async () => ({ modifiedCount: 0 }));
    const store = mongoNotifyStore(fakeDb({ notification_reminders: { updateOne } }));
    expect(await store.claimReminder("d1", "orders", NOW, 2, NOW)).toBe(false);
    expect(updateOne).toHaveBeenCalledWith({ destinationId: "d1", checkId: "orders", since: NOW, sent: 2 }, { $inc: { sent: 1 }, $set: { lastAt: NOW } });
  });

  it("releases only its own claim", async () => {
    const deleteOne = vi.fn(async () => ({}));
    const updateOne = vi.fn(async () => ({}));
    const store = mongoNotifyStore(fakeDb({ notification_reminders: { deleteOne, updateOne } }));
    await store.releaseReminder("d1", "orders", NOW, 1);
    await store.releaseReminder("d1", "orders", NOW, 3);
    expect(deleteOne).toHaveBeenCalledWith({ destinationId: "d1", checkId: "orders", since: NOW, sent: 1 });
    expect(updateOne).toHaveBeenCalledWith({ destinationId: "d1", checkId: "orders", since: NOW, sent: 3 }, { $inc: { sent: -1 } });
  });
});

describe("takeSendSlot and claimDigest", () => {
  it("never touch the database for an id that is not an ObjectId", async () => {
    const updateOne = vi.fn();
    const store = mongoNotifyStore(fakeDb({ notification_destinations: { updateOne } }));
    expect(await store.takeSendSlot("nope", NOW, 30)).toBe(false);
    expect(await store.claimDigest("nope", NOW, NOW)).toBe(false);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("takes a slot only when the conditional update matched", async () => {
    const id = new ObjectId().toHexString();
    const store = (modifiedCount: number) => mongoNotifyStore(fakeDb({ notification_destinations: { updateOne: async () => ({ modifiedCount }) } }));
    expect(await store(1).takeSendSlot(id, NOW, 30)).toBe(true);
    expect(await store(0).takeSendSlot(id, NOW, 30)).toBe(false);
  });
});

describe("document mapping", () => {
  it("fills defaults for destinations and events written before a field existed", () => {
    const destination = toDestination({ _id: "d1", kind: "slack", name: "Ops", sealed: "x", createdAt: NOW });
    expect(destination).toMatchObject({ workspaceId: "default", label: "", language: "en", alerts: [], tags: [], enabled: true, source: "paste", remind: null, digest: null });
    const event = toStoredEvent({ _id: "e1", type: "check.outcome_changed", checkId: "orders", runId: "r1", to: "error", at: NOW });
    expect(event).toMatchObject({ workspaceId: "default", from: null, rowCount: 0, diff: null, error: null, suppressed: null, actionKey: null });
  });
});
