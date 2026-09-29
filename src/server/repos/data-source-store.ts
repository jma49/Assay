import type { Db, Document, WithId } from "mongodb";
import { DEFAULT_SOURCE_ID, type SourceEngine } from "@/domain/data-source";
import { COLLECTIONS } from "@/lib/database/collections";
import type { SourceRecord } from "@/server/datasource/registry";

/** A stored test result. */
export interface StoredTest {
  ok: boolean;
  at: Date;
  error?: string;
  serverVersion?: string;
  currentUser?: string;
  readOnly?: boolean;
  writeAccess?: string[];
}

/** A `data_sources` document. `connection` is the sealed connection string; it never leaves the server. */
export interface DataSourceDoc {
  workspaceId: string;
  sourceId: string;
  name: string;
  engine: SourceEngine;
  connection: string;
  display: string;
  createdBy: { id: string; name: string };
  createdAt: Date;
  updatedBy: { id: string; name: string };
  updatedAt: Date;
  version: number;
  lastTest: StoredTest | null;
}

const collection = (db: Db) => db.collection<DataSourceDoc>(COLLECTIONS.dataSources);

// Unlike older collections, every data source has carried its workspace from the start.
const inWorkspace = (workspaceId: string) => ({ workspaceId });

export async function listSourceDocs(db: Db, workspaceId: string): Promise<WithId<DataSourceDoc>[]> {
  return collection(db).find(inWorkspace(workspaceId)).sort({ createdAt: 1 }).toArray();
}

export async function findSourceDoc(db: Db, workspaceId: string, sourceId: string): Promise<WithId<DataSourceDoc> | null> {
  return collection(db).findOne({ sourceId, ...inWorkspace(workspaceId) });
}

/** What the registry reads to open a pool. */
export async function findSourceRecord(db: Db, workspaceId: string, sourceId: string): Promise<SourceRecord | null> {
  const doc = await collection(db).findOne(
    { sourceId, ...inWorkspace(workspaceId) },
    { projection: { _id: 0, sourceId: 1, version: 1, connection: 1 } },
  );
  return doc ? { sourceId: doc.sourceId, version: doc.version, connection: doc.connection } : null;
}

export async function insertSourceDoc(db: Db, doc: DataSourceDoc): Promise<void> {
  await collection(db).insertOne(doc);
}

/** Applies `set` only onto `expectedVersion` and bumps it; null when the version or the source did not match. */
export async function updateSourceDoc(
  db: Db,
  workspaceId: string,
  sourceId: string,
  expectedVersion: number,
  set: Partial<DataSourceDoc>,
): Promise<WithId<DataSourceDoc> | null> {
  return collection(db).findOneAndUpdate(
    { sourceId, version: expectedVersion, ...inWorkspace(workspaceId) },
    { $set: set, $inc: { version: 1 } },
    { returnDocument: "after" },
  );
}

export async function deleteSourceDoc(db: Db, workspaceId: string, sourceId: string): Promise<boolean> {
  const { deletedCount } = await collection(db).deleteOne({ sourceId, ...inWorkspace(workspaceId) });
  return deletedCount > 0;
}

/** Records a test; only onto the version that was tested, so a result never lands on an edited connection. */
export async function recordSourceTest(db: Db, workspaceId: string, sourceId: string, version: number, test: StoredTest): Promise<void> {
  await collection(db).updateOne({ sourceId, version, ...inWorkspace(workspaceId) }, { $set: { lastTest: test } });
}

/** How many checks run against each source; checks without a source count for `default`. */
export async function checkCountsBySource(db: Db): Promise<Map<string, number>> {
  const groups = await db
    .collection(COLLECTIONS.checks)
    .aggregate<Document>([{ $group: { _id: { $ifNull: ["$dataSourceId", DEFAULT_SOURCE_ID] }, count: { $sum: 1 } } }])
    .toArray();
  return new Map(groups.map((group) => [String(group._id), Number(group.count)]));
}

/** The checks that run against a source; a check without one runs against `default`. */
export function checksOfSource(sourceId: string): Document {
  return sourceId === DEFAULT_SOURCE_ID ? { dataSourceId: { $in: [DEFAULT_SOURCE_ID, null] } } : { dataSourceId: sourceId };
}

export async function countChecksUsing(db: Db, sourceId: string): Promise<number> {
  return db.collection(COLLECTIONS.checks).countDocuments(checksOfSource(sourceId));
}
