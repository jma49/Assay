import type { Db, Document } from "mongodb";
import type { CoverageScript } from "@/lib/coverage/coverage";
import { COLLECTIONS } from "@/lib/database/collections";
import { checksOfSource } from "@/server/repos/data-source-store";

/** One check by its id, with only the listed fields (and _id); null when there is none. */
export async function findCheckFields(db: Db, scriptId: string, fields: readonly string[]): Promise<Document | null> {
  const projection = Object.fromEntries(fields.map((field) => [field, 1]));
  return db.collection(COLLECTIONS.checks).findOne({ scriptId }, { projection });
}

/** The checks that run against a data source, with the fields coverage needs. */
export async function coverageChecksOfSource(db: Db, sourceId: string): Promise<CoverageScript[]> {
  return db
    .collection<CoverageScript>(COLLECTIONS.checks)
    .find(checksOfSource(sourceId), { projection: { _id: 0, scriptId: 1, name: 1, cnName: 1, sqlContent: 1 } })
    .toArray();
}
