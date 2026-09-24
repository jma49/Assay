// 编辑历史帮助函数
import { ScriptSnapshot } from "./edit-history-schema";

export interface ChangeDetail {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface RecordEditHistoryParams {
  scriptId: string;
  operation: "create" | "update" | "delete";
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  description?: string;
}

/**
 * 比较两个对象，返回变更的字段列表
 */
export function getObjectChanges(
  oldObj: Record<string, unknown> | null | undefined,
  newObj: Record<string, unknown> | null | undefined,
): ChangeDetail[] {
  const changes: ChangeDetail[] = [];

  // 获取所有可能的键
  const allKeys = new Set([
    ...Object.keys(oldObj || {}),
    ...Object.keys(newObj || {}),
  ]);

  // 需要跟踪的字段
  const trackedFields = [
    "name",
    "cnName",
    "description",
    "cnDescription",
    "scope",
    "cnScope",
    "author",
    "isScheduled",
    "cronSchedule",
    "sqlContent",
  ];

  for (const key of allKeys) {
    // 只跟踪指定的字段
    if (!trackedFields.includes(key)) continue;

    const oldValue = oldObj?.[key];
    const newValue = newObj?.[key];

    // 比较值，处理空值和未定义值
    if (normalizeValue(oldValue) !== normalizeValue(newValue)) {
      changes.push({
        field: key,
        oldValue: oldValue,
        newValue: newValue,
      });
    }
  }

  return changes;
}

/**
 * 规范化值用于比较
 */
function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "boolean") {
    return value.toString();
  }
  return String(value).trim();
}

/**
 * 创建脚本快照
 */
function createScriptSnapshot(
  scriptData: Record<string, unknown>,
): ScriptSnapshot {
  return {
    scriptId: String(scriptData.scriptId || ""),
    name: String(scriptData.name || ""),
    cnName: String(scriptData.cnName || ""),
    description: String(scriptData.description || ""),
    cnDescription: String(scriptData.cnDescription || ""),
    scope: String(scriptData.scope || ""),
    cnScope: String(scriptData.cnScope || ""),
    author: String(scriptData.author || ""),
    isScheduled: Boolean(scriptData.isScheduled),
    cronSchedule: String(scriptData.cronSchedule || ""),
  };
}

/**
 * Computes what to store for a script change: the changed fields and a snapshot.
 * Returns null for an update that touched no tracked field.
 */
export function buildEditHistoryEntry({
  scriptId,
  operation,
  oldData,
  newData,
}: RecordEditHistoryParams): { changes: ChangeDetail[]; scriptSnapshot: ScriptSnapshot } | null {
  const changes =
    operation === "update" && oldData && newData ? getObjectChanges(oldData, newData) : [];
  if (operation === "update" && oldData && newData && changes.length === 0) {
    return null;
  }

  const source = operation === "delete" ? oldData ?? newData : newData ?? oldData;
  const scriptSnapshot: ScriptSnapshot = source
    ? createScriptSnapshot(source)
    : { scriptId, name: "", author: "" };

  return { changes, scriptSnapshot };
}
