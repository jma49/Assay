import { ObjectId, type Db, type Document, type Filter } from "mongodb";
import type { ActivityDelivery, ActivityItem, ActivityPage } from "@/contracts/activity";
import { alertKindOf, type AlertKind } from "@/domain/notify";
import { DEFAULT_WORKSPACE_ID } from "@/domain/workspace";
import { toStoredEvent } from "@/server/repos/notify-store";
import { COLLECTIONS } from "@/lib/database/collections";

export const ACTIVITY_PAGE_SIZE = 40;

/** Which stored events each filter shows; an alert kind is derived from type and outcome. */
const KIND_FILTER: Record<AlertKind, Filter<Document>> = {
  broken: { to: "error" },
  issues: { to: "issues", type: "check.outcome_changed" },
  new_rows: { to: "issues", type: "check.new_rows" },
  recovered: { to: "clean" },
};

/** The cursor is the last item's time and id: stable while new events arrive on top. */
export function encodeCursor(at: Date, id: string): string {
  return Buffer.from(`${at.toISOString()}|${id}`).toString("base64url");
}

export function decodeCursor(cursor: string | null): { at: Date; id: ObjectId } | null {
  if (!cursor) return null;
  const [at, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
  const date = new Date(at);
  if (!id || Number.isNaN(date.getTime()) || !ObjectId.isValid(id)) return null;
  return { at: date, id: new ObjectId(id) };
}

/** What changed across the workspace's checks, newest first, with where each alert went. */
export async function listActivity(
  db: Db,
  workspaceId: string,
  options: { cursor?: string | null; kinds?: AlertKind[]; limit?: number } = {},
): Promise<ActivityPage> {
  const limit = options.limit ?? ACTIVITY_PAGE_SIZE;
  const and: Filter<Document>[] = [
    workspaceId === DEFAULT_WORKSPACE_ID ? { workspaceId: { $in: [workspaceId, null] } } : { workspaceId },
  ];
  if (options.kinds?.length) and.push({ $or: options.kinds.map((kind) => KIND_FILTER[kind]) });
  const cursor = decodeCursor(options.cursor ?? null);
  if (cursor) and.push({ $or: [{ at: { $lt: cursor.at } }, { at: cursor.at, _id: { $lt: cursor.id } }] });

  const docs = await db
    .collection(COLLECTIONS.events)
    .find({ $and: and })
    .sort({ at: -1, _id: -1 })
    .limit(limit + 1)
    .toArray();
  const page = docs.slice(0, limit).map(toStoredEvent);

  const [checks, deliveries] = await Promise.all([
    db
      .collection(COLLECTIONS.checks)
      .find({ scriptId: { $in: [...new Set(page.map((e) => e.checkId))] } }, { projection: { scriptId: 1, name: 1, cnName: 1 } })
      .toArray(),
    db
      .collection(COLLECTIONS.notificationDeliveries)
      .find({ eventId: { $in: page.map((e) => e.id) } }, { projection: { eventId: 1, destinationId: 1, status: 1 } })
      .toArray(),
  ]);
  const destinationIds = [...new Set(deliveries.map((d) => String(d.destinationId)))].filter(ObjectId.isValid).map((id) => new ObjectId(id));
  const destinations = destinationIds.length
    ? await db.collection(COLLECTIONS.notificationDestinations).find({ _id: { $in: destinationIds } }, { projection: { name: 1, kind: 1 } }).toArray()
    : [];
  const checkById = new Map(checks.map((c) => [String(c.scriptId), c]));
  const destinationById = new Map(destinations.map((d) => [String(d._id), d]));
  const deliveriesByEvent = new Map<string, ActivityDelivery[]>();
  for (const delivery of deliveries) {
    const destination = destinationById.get(String(delivery.destinationId));
    if (!destination) continue;
    const list = deliveriesByEvent.get(delivery.eventId) ?? [];
    list.push({ destination: destination.name, kind: destination.kind, status: delivery.status });
    deliveriesByEvent.set(delivery.eventId, list);
  }

  const items: ActivityItem[] = page.map((event) => {
    const check = checkById.get(event.checkId);
    return {
      id: event.id,
      checkId: event.checkId,
      checkName: String(check?.name ?? event.checkId),
      cnName: check?.cnName || undefined,
      kind: alertKindOf(event),
      from: event.from,
      to: event.to,
      rowCount: event.rowCount,
      diff: event.diff,
      error: event.error ?? null,
      runId: event.runId,
      at: event.at.toISOString(),
      deliveries: deliveriesByEvent.get(event.id) ?? [],
      suppressed: event.suppressed ?? null,
    };
  });
  const last = page[page.length - 1];
  return { items, nextCursor: docs.length > limit && last ? encodeCursor(last.at, last.id) : null };
}
