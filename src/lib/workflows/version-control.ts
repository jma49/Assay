import { getMongoDbClient } from "../database/mongodb";
import { Collection, Document } from "mongodb";
import { COLLECTIONS } from "@/lib/database/collections";

export enum VersionStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  ARCHIVED = "archived",
  DEPRECATED = "deprecated",
}

export interface ScriptVersion {
  versionId: string;
  scriptId: string;
  version: string; // semantic, e.g. "1.1.0"; unrelated to sql_scripts.version
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

async function getScriptVersionsCollection(): Promise<Collection<Document>> {
  const mongoDbClient = getMongoDbClient();
  const db = await mongoDbClient.getDb();
  return db.collection(COLLECTIONS.scriptVersions);
}

async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const mongoDbClient = getMongoDbClient();
  const db = await mongoDbClient.getDb();
  return db.collection(COLLECTIONS.checks);
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

/** Throws when the read fails: guessing "no versions yet" would start a second 1.0.0. */
async function getLatestVersion(scriptId: string): Promise<string | null> {
  const collection = await getScriptVersionsCollection();
  const latestVersion = await collection.findOne(
    { scriptId },
    {
      projection: { version: 1 },
      sort: { majorVersion: -1, minorVersion: -1, patchVersion: -1 },
    }
  );
  return latestVersion ? latestVersion.version : null;
}

/**
 * Records a new version of a check and makes it the current one.
 */
export async function createScriptVersion(
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
  },
  createdBy: string,
  createdByEmail: string,
  changeType: ScriptVersion["changeType"] = "create",
  changeDescription?: string,
  versionType: "major" | "minor" | "patch" = "patch"
): Promise<string | null> {
  try {
    const collection = await getScriptVersionsCollection();

    const latestVersion = await getLatestVersion(scriptId);
    const newVersion = generateNextVersion(latestVersion, versionType);
    const { major, minor, patch } = parseVersion(newVersion);

    const versionId = generateVersionId();
    const now = new Date();

    // Only one version is current; a first version has none to demote.
    if (latestVersion) {
      await collection.updateMany(
        { scriptId, isCurrentVersion: true },
        { $set: { isCurrentVersion: false, status: VersionStatus.ARCHIVED } }
      );
    }

    const versionData: ScriptVersion = {
      versionId,
      scriptId,
      version: newVersion,
      majorVersion: major,
      minorVersion: minor,
      patchVersion: patch,
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

      createdBy,
      createdByEmail,
      createdAt: now,

      changeType,
      changeDescription,
      previousVersionId: latestVersion
        ? (await getVersionId(scriptId, latestVersion)) || undefined
        : undefined,

      executionCount: 0,
      rollbackCount: 0,
    };

    const result = await collection.insertOne(versionData);

    if (result.acknowledged) {
      console.log(
        `[VersionControl] 脚本版本已创建: ${scriptId} v${newVersion}`
      );

      await updateMainScriptVersion(scriptId, versionId, newVersion);

      return versionId;
    }

    return null;
  } catch (error) {
    console.error("[VersionControl] 创建脚本版本失败:", error);
    return null;
  }
}

async function getVersionId(
  scriptId: string,
  version: string
): Promise<string | null> {
  try {
    const collection = await getScriptVersionsCollection();
    const versionDoc = await collection.findOne(
      { scriptId, version },
      { projection: { versionId: 1 } }
    );

    return versionDoc ? versionDoc.versionId : null;
  } catch (error) {
    console.error("[VersionControl] 获取版本ID失败:", error);
    return null;
  }
}

async function updateMainScriptVersion(
  scriptId: string,
  versionId: string,
  version: string
): Promise<void> {
  try {
    const collection = await getSqlScriptsCollection();
    await collection.updateOne(
      { scriptId },
      {
        $set: {
          currentVersionId: versionId,
          currentVersion: version,
          updatedAt: new Date(),
        },
      }
    );
  } catch (error) {
    console.error("[VersionControl] 更新主脚本版本信息失败:", error);
  }
}
