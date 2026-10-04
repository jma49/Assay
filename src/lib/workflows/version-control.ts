import type { Db } from "mongodb";
import { COLLECTIONS } from "@/lib/database/collections";
import { logError } from "@/server/logging/log";

enum VersionStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  ARCHIVED = "archived",
  DEPRECATED = "deprecated",
}

export interface ScriptVersion {
  versionId: string;
  scriptId: string;
  version: string; // semantic, e.g. "1.1.0"; unrelated to a check's version
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  status: VersionStatus;
  isCurrentVersion: boolean;

  name: string;
  cnName?: string;
  description?: string;
  cnDescription?: string;
  scope?: string;
  cnScope?: string;
  author: string;
  hashtags?: string[];
  sqlContent: string;
  /** Missing on versions saved before data sources, and for the built-in one. */
  dataSourceId?: string;

  createdBy: string;
  createdByEmail: string;
  createdAt: Date;
  approvalStatus?: string;
  approvalRequestId?: string;

  changeType: "create" | "update" | "rollback" | "merge";
  changeDescription?: string;
  previousVersionId?: string;
  compareWith?: string; // the version this one was compared with

  executionCount?: number;
  lastExecutedAt?: Date;
  rollbackCount?: number;
}

function generateVersionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `ver_${timestamp}_${random}`;
}

function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
} {
  const parts = version.split(".").map((part) => parseInt(part, 10));
  return {
    major: parts[0] || 1,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

function generateNextVersion(
  lastVersion: string | null,
  changeType: "major" | "minor" | "patch" = "patch"
): string {
  if (!lastVersion) {
    return "1.0.0";
  }

  const { major, minor, patch } = parseVersion(lastVersion);

  switch (changeType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

const DUPLICATE_KEY = 11000;
const MAX_ATTEMPTS = 10;

type VersionParts = { majorVersion: number; minorVersion: number; patchVersion: number };

/** Versions ordered below `parts` (semantic order, not insertion order). */
const lowerThan = ({ majorVersion: M, minorVersion: m, patchVersion: p }: VersionParts) => ({
  $or: [
    { majorVersion: { $lt: M } },
    { majorVersion: M, minorVersion: { $lt: m } },
    { majorVersion: M, minorVersion: m, patchVersion: { $lt: p } },
  ],
});

const higherThan = ({ majorVersion: M, minorVersion: m, patchVersion: p }: VersionParts) => ({
  $or: [
    { majorVersion: { $gt: M } },
    { majorVersion: M, minorVersion: { $gt: m } },
    { majorVersion: M, minorVersion: m, patchVersion: { $gt: p } },
  ],
});

/** One number that sorts like the version, for a conditional update on the check. */
const versionOrder = ({ majorVersion, minorVersion, patchVersion }: VersionParts) =>
  majorVersion * 1e10 + minorVersion * 1e5 + patchVersion;

/**
 * Records a new version of a check and makes it the current one.
 *
 * Two saves at once both see the same latest version; the unique index on
 * (scriptId, version) lets only one insert it, and the other retries with
 * the next number, so every save gets a record. The current flag moves
 * only after the insert succeeded and only downwards: each writer demotes
 * the versions below its own, and demotes its own if a higher one already
 * exists, so whatever the interleaving the highest version stays current.
 */
export async function createScriptVersion(
  db: Db,
  scriptId: string,
  scriptData: {
    name: string;
    cnName?: string;
    description?: string;
    cnDescription?: string;
    scope?: string;
    cnScope?: string;
    author: string;
    hashtags?: string[];
    sqlContent: string;
    dataSourceId?: string;
  },
  createdBy: string,
  createdByEmail: string,
  changeType: ScriptVersion["changeType"] = "create",
  changeDescription?: string,
  versionType: "major" | "minor" | "patch" = "patch",
): Promise<string | null> {
  const versions = db.collection(COLLECTIONS.scriptVersions);
  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      // Throws when the read fails: guessing "no versions yet" would start a second 1.0.0.
      const latest = await versions.findOne(
        { scriptId },
        { projection: { version: 1, versionId: 1 }, sort: { majorVersion: -1, minorVersion: -1, patchVersion: -1 } },
      );
      const newVersion = generateNextVersion(latest?.version ?? null, versionType);
      const { major, minor, patch } = parseVersion(newVersion);
      const parts: VersionParts = { majorVersion: major, minorVersion: minor, patchVersion: patch };
      const versionId = generateVersionId();

      const versionData: ScriptVersion = {
        versionId,
        scriptId,
        version: newVersion,
        ...parts,
        status: VersionStatus.ACTIVE,
        isCurrentVersion: true,

        name: scriptData.name,
        cnName: scriptData.cnName,
        description: scriptData.description,
        cnDescription: scriptData.cnDescription,
        scope: scriptData.scope,
        cnScope: scriptData.cnScope,
        author: scriptData.author,
        hashtags: scriptData.hashtags || [],
        sqlContent: scriptData.sqlContent,
        ...(scriptData.dataSourceId && { dataSourceId: scriptData.dataSourceId }),

        createdBy,
        createdByEmail,
        createdAt: new Date(),

        changeType,
        changeDescription,
        previousVersionId: latest?.versionId || undefined,

        executionCount: 0,
        rollbackCount: 0,
      };

      try {
        await versions.insertOne({ ...versionData });
      } catch (error) {
        if ((error as { code?: number }).code === DUPLICATE_KEY) continue; // another save took this number
        throw error;
      }

      const archived = { $set: { isCurrentVersion: false, status: VersionStatus.ARCHIVED } };
      await versions.updateMany({ scriptId, isCurrentVersion: true, versionId: { $ne: versionId }, ...lowerThan(parts) }, archived);
      if (await versions.countDocuments({ scriptId, ...higherThan(parts) }, { limit: 1 })) {
        await versions.updateOne({ versionId }, archived);
        return versionId;
      }
      const order = versionOrder(parts);
      await db.collection(COLLECTIONS.checks).updateOne(
        { scriptId, $or: [{ currentVersionOrder: { $exists: false } }, { currentVersionOrder: { $lt: order } }] },
        { $set: { currentVersionId: versionId, currentVersion: newVersion, currentVersionOrder: order } },
      );
      return versionId;
    }
    throw new Error(`No free version number after ${MAX_ATTEMPTS} attempts`);
  } catch (error) {
    logError(`[VersionControl] Recording a version of ${scriptId} failed`, { error: error });
    return null;
  }
}
