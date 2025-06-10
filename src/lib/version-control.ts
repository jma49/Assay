import mongoDbClient from "./mongodb";
import { Collection, Document } from "mongodb";
import { clearScriptsCache } from "@/app/api/list-scripts/route";

// 版本状态枚举
export enum VersionStatus {
  DRAFT = "draft", // 草稿版本
  ACTIVE = "active", // 当前活跃版本
  ARCHIVED = "archived", // 已归档版本
  DEPRECATED = "deprecated", // 已废弃版本
}

// 脚本版本接口
export interface ScriptVersion {
  versionId: string;
  scriptId: string;
  version: string; // 版本号，如 "1.0.0", "1.1.0"
  majorVersion: number; // 主版本号
  minorVersion: number; // 次版本号
  patchVersion: number; // 修订版本号
  status: VersionStatus;
  isCurrentVersion: boolean; // 是否为当前版本

  // 脚本内容
  name: string;
  cnName?: string;
  description?: string;
  cnDescription?: string;
  scope?: string;
  cnScope?: string;
  author: string;
  hashtags?: string[];
  sqlContent: string;

  // 版本元数据
  createdBy: string;
  createdByEmail: string;
  createdAt: Date;
  approvalStatus?: string;
  approvalRequestId?: string;

  // 变更信息
  changeType: "create" | "update" | "rollback" | "merge";
  changeDescription?: string;
  previousVersionId?: string;
  compareWith?: string; // 与哪个版本比较

  // 统计信息
  executionCount?: number;
  lastExecutedAt?: Date;
  rollbackCount?: number;
}

// 版本比较结果接口
export interface VersionDiff {
  scriptId: string;
  fromVersion: string;
  toVersion: string;
  differences: {
    field: string;
    label: string;
    oldValue: string | undefined;
    newValue: string | undefined;
    changeType: "added" | "removed" | "modified" | "unchanged";
  }[];
  sqlDiff?: {
    additions: string[];
    deletions: string[];
    modifications: string[];
  };
}

// 获取脚本版本集合
async function getScriptVersionsCollection(): Promise<Collection<Document>> {
  const db = await mongoDbClient.getDb();
  return db.collection("script_versions");
}

// 获取主脚本集合
async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const db = await mongoDbClient.getDb();
  return db.collection("sql_scripts");
}

/**
 * 生成唯一的版本ID
 */
function generateVersionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `ver_${timestamp}_${random}`;
}

/**
 * 解析版本号
 */
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

/**
 * 生成下一个版本号
 */
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

/**
 * 获取脚本的最新版本号
 */
async function getLatestVersion(scriptId: string): Promise<string | null> {
  try {
    const collection = await getScriptVersionsCollection();
    const latestVersion = await collection.findOne(
      { scriptId },
      {
        projection: { version: 1 },
        sort: { majorVersion: -1, minorVersion: -1, patchVersion: -1 },
      }
    );

    return latestVersion ? latestVersion.version : null;
  } catch (error) {
    console.error("[VersionControl] 获取最新版本失败:", error);
    return null;
  }
}

/**
 * 创建脚本版本
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

    // 获取最新版本号
    const latestVersion = await getLatestVersion(scriptId);
    const newVersion = generateNextVersion(latestVersion, versionType);
    const { major, minor, patch } = parseVersion(newVersion);

    const versionId = generateVersionId();
    const now = new Date();

    // 如果不是第一个版本，先将其他版本设为非当前版本
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

      // 脚本内容
      name: scriptData.name,
      cnName: scriptData.cnName,
      description: scriptData.description,
      cnDescription: scriptData.cnDescription,
      scope: scriptData.scope,
      cnScope: scriptData.cnScope,
      author: scriptData.author,
      hashtags: scriptData.hashtags || [],
      sqlContent: scriptData.sqlContent,

      // 版本元数据
      createdBy,
      createdByEmail,
      createdAt: now,

      // 变更信息
      changeType,
      changeDescription,
      previousVersionId: latestVersion
        ? (await getVersionId(scriptId, latestVersion)) || undefined
        : undefined,

      // 统计信息
      executionCount: 0,
      rollbackCount: 0,
    };

    const result = await collection.insertOne(versionData);

    if (result.acknowledged) {
      console.log(
        `[VersionControl] 脚本版本已创建: ${scriptId} v${newVersion}`
      );

      // 更新主脚本表的当前版本信息
      await updateMainScriptVersion(scriptId, versionId, newVersion);

      return versionId;
    }

    return null;
  } catch (error) {
    console.error("[VersionControl] 创建脚本版本失败:", error);
    return null;
  }
}

/**
 * 获取版本ID
 */
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

/**
 * 更新主脚本表的版本信息
 */
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

/**
 * 获取脚本的所有版本
 */
export async function getScriptVersions(
  scriptId: string,
  limit: number = 50
): Promise<ScriptVersion[]> {
  try {
    const collection = await getScriptVersionsCollection();
    const versions = await collection
      .find({ scriptId })
      .sort({ majorVersion: -1, minorVersion: -1, patchVersion: -1 })
      .limit(limit)
      .toArray();

    return versions.map((doc) => ({
      versionId: doc.versionId,
      scriptId: doc.scriptId,
      version: doc.version,
      majorVersion: doc.majorVersion,
      minorVersion: doc.minorVersion,
      patchVersion: doc.patchVersion,
      status: doc.status,
      isCurrentVersion: doc.isCurrentVersion,

      name: doc.name,
      cnName: doc.cnName,
      description: doc.description,
      cnDescription: doc.cnDescription,
      scope: doc.scope,
      cnScope: doc.cnScope,
      author: doc.author,
      hashtags: doc.hashtags,
      sqlContent: doc.sqlContent,

      createdBy: doc.createdBy,
      createdByEmail: doc.createdByEmail,
      createdAt: doc.createdAt,
      approvalStatus: doc.approvalStatus,
      approvalRequestId: doc.approvalRequestId,

      changeType: doc.changeType,
      changeDescription: doc.changeDescription,
      previousVersionId: doc.previousVersionId,
      compareWith: doc.compareWith,

      executionCount: doc.executionCount || 0,
      lastExecutedAt: doc.lastExecutedAt,
      rollbackCount: doc.rollbackCount || 0,
    })) as ScriptVersion[];
  } catch (error) {
    console.error("[VersionControl] 获取脚本版本列表失败:", error);
    return [];
  }
}

/**
 * 获取特定版本的脚本
 */
export async function getScriptVersion(
  scriptId: string,
  version: string
): Promise<ScriptVersion | null> {
  try {
    const collection = await getScriptVersionsCollection();
    const versionDoc = await collection.findOne({ scriptId, version });

    if (!versionDoc) {
      return null;
    }

    return {
      versionId: versionDoc.versionId,
      scriptId: versionDoc.scriptId,
      version: versionDoc.version,
      majorVersion: versionDoc.majorVersion,
      minorVersion: versionDoc.minorVersion,
      patchVersion: versionDoc.patchVersion,
      status: versionDoc.status,
      isCurrentVersion: versionDoc.isCurrentVersion,

      name: versionDoc.name,
      cnName: versionDoc.cnName,
      description: versionDoc.description,
      cnDescription: versionDoc.cnDescription,
      scope: versionDoc.scope,
      cnScope: versionDoc.cnScope,
      author: versionDoc.author,
      hashtags: versionDoc.hashtags,
      sqlContent: versionDoc.sqlContent,

      createdBy: versionDoc.createdBy,
      createdByEmail: versionDoc.createdByEmail,
      createdAt: versionDoc.createdAt,
      approvalStatus: versionDoc.approvalStatus,
      approvalRequestId: versionDoc.approvalRequestId,

      changeType: versionDoc.changeType,
      changeDescription: versionDoc.changeDescription,
      previousVersionId: versionDoc.previousVersionId,
      compareWith: versionDoc.compareWith,

      executionCount: versionDoc.executionCount || 0,
      lastExecutedAt: versionDoc.lastExecutedAt,
      rollbackCount: versionDoc.rollbackCount || 0,
    } as ScriptVersion;
  } catch (error) {
    console.error("[VersionControl] 获取脚本版本失败:", error);
    return null;
  }
}

/**
 * 回滚到指定版本
 */
export async function rollbackToVersion(
  scriptId: string,
  targetVersion: string,
  rollbackBy: string,
  rollbackByEmail: string,
  rollbackReason?: string
): Promise<{ success: boolean; message: string; newVersionId?: string }> {
  try {
    // 获取目标版本
    const targetVersionData = await getScriptVersion(scriptId, targetVersion);
    if (!targetVersionData) {
      return { success: false, message: "目标版本不存在" };
    }

    // 创建新版本（基于目标版本的内容）
    const newVersionId = await createScriptVersion(
      scriptId,
      {
        name: targetVersionData.name,
        cnName: targetVersionData.cnName,
        description: targetVersionData.description,
        cnDescription: targetVersionData.cnDescription,
        scope: targetVersionData.scope,
        cnScope: targetVersionData.cnScope,
        author: targetVersionData.author,
        hashtags: targetVersionData.hashtags,
        sqlContent: targetVersionData.sqlContent,
      },
      rollbackBy,
      rollbackByEmail,
      "rollback",
      rollbackReason || `回滚到版本 ${targetVersion}`,
      "patch"
    );

    if (newVersionId) {
      // 更新目标版本的回滚计数
      const collection = await getScriptVersionsCollection();
      await collection.updateOne(
        { scriptId, version: targetVersion },
        { $inc: { rollbackCount: 1 } }
      );

      // 清除缓存
      await clearScriptsCache();

      console.log(
        `[VersionControl] 脚本已回滚: ${scriptId} 回滚到 v${targetVersion}`
      );

      return {
        success: true,
        message: `已成功回滚到版本 ${targetVersion}`,
        newVersionId,
      };
    }

    return { success: false, message: "回滚操作失败" };
  } catch (error) {
    console.error("[VersionControl] 回滚版本失败:", error);
    return { success: false, message: "回滚操作时发生错误" };
  }
}

/**
 * 比较两个版本的差异
 */
export async function compareVersions(
  scriptId: string,
  fromVersion: string,
  toVersion: string
): Promise<VersionDiff | null> {
  try {
    const [fromVersionData, toVersionData] = await Promise.all([
      getScriptVersion(scriptId, fromVersion),
      getScriptVersion(scriptId, toVersion),
    ]);

    if (!fromVersionData || !toVersionData) {
      return null;
    }

    const differences: VersionDiff["differences"] = [];

    // 比较字段
    const fieldsToCompare = [
      { field: "name", label: "脚本名称" },
      { field: "cnName", label: "中文名称" },
      { field: "description", label: "描述" },
      { field: "cnDescription", label: "中文描述" },
      { field: "scope", label: "作用域" },
      { field: "cnScope", label: "中文作用域" },
      { field: "author", label: "作者" },
      { field: "sqlContent", label: "SQL内容" },
    ];

    for (const { field, label } of fieldsToCompare) {
      const oldValue = (fromVersionData as unknown as Record<string, unknown>)[
        field
      ];
      const newValue = (toVersionData as unknown as Record<string, unknown>)[
        field
      ];

      let changeType: "added" | "removed" | "modified" | "unchanged" =
        "unchanged";

      if (oldValue !== newValue) {
        if (!oldValue && newValue) {
          changeType = "added";
        } else if (oldValue && !newValue) {
          changeType = "removed";
        } else {
          changeType = "modified";
        }
      }

      differences.push({
        field,
        label,
        oldValue: oldValue as string | undefined,
        newValue: newValue as string | undefined,
        changeType,
      });
    }

    // SQL 内容的详细差异分析（简单实现）
    const sqlDiff = analyzeSqlDiff(
      fromVersionData.sqlContent,
      toVersionData.sqlContent
    );

    return {
      scriptId,
      fromVersion,
      toVersion,
      differences,
      sqlDiff,
    };
  } catch (error) {
    console.error("[VersionControl] 比较版本失败:", error);
    return null;
  }
}

/**
 * 分析SQL内容差异（简单实现）
 */
function analyzeSqlDiff(
  oldSql: string,
  newSql: string
): VersionDiff["sqlDiff"] {
  const oldLines = oldSql
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);
  const newLines = newSql
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  const additions: string[] = [];
  const deletions: string[] = [];
  const modifications: string[] = [];

  // 简单的行级差异分析
  oldLines.forEach((oldLine) => {
    if (!newLines.includes(oldLine)) {
      deletions.push(oldLine);
    }
  });

  newLines.forEach((newLine) => {
    if (!oldLines.includes(newLine)) {
      additions.push(newLine);
    }
  });

  return {
    additions,
    deletions,
    modifications, // 这里简化处理，实际可以用更复杂的算法
  };
}

/**
 * 获取版本统计信息
 */
export async function getVersionStatistics(scriptId: string): Promise<{
  totalVersions: number;
  currentVersion: string;
  totalExecutions: number;
  totalRollbacks: number;
  latestChange: Date;
}> {
  try {
    const collection = await getScriptVersionsCollection();

    const [stats, currentVersionData] = await Promise.all([
      collection
        .aggregate([
          { $match: { scriptId } },
          {
            $group: {
              _id: null,
              totalVersions: { $sum: 1 },
              totalExecutions: { $sum: { $ifNull: ["$executionCount", 0] } },
              totalRollbacks: { $sum: { $ifNull: ["$rollbackCount", 0] } },
              latestChange: { $max: "$createdAt" },
            },
          },
        ])
        .toArray(),
      collection.findOne(
        { scriptId, isCurrentVersion: true },
        { projection: { version: 1 } }
      ),
    ]);

    const statsData = stats[0] || {
      totalVersions: 0,
      totalExecutions: 0,
      totalRollbacks: 0,
      latestChange: new Date(),
    };

    return {
      totalVersions: statsData.totalVersions,
      currentVersion: currentVersionData?.version || "1.0.0",
      totalExecutions: statsData.totalExecutions,
      totalRollbacks: statsData.totalRollbacks,
      latestChange: statsData.latestChange,
    };
  } catch (error) {
    console.error("[VersionControl] 获取版本统计失败:", error);
    return {
      totalVersions: 0,
      currentVersion: "1.0.0",
      totalExecutions: 0,
      totalRollbacks: 0,
      latestChange: new Date(),
    };
  }
}
