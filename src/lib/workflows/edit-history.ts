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
 * 记录编辑历史
 */
export async function recordEditHistory({
  scriptId,
  operation,
  oldData,
  newData,
  description,
}: RecordEditHistoryParams): Promise<boolean> {
  try {
    let changes: ChangeDetail[] = [];

    // 计算变更（仅对更新操作）
    if (operation === "update" && oldData && newData) {
      changes = getObjectChanges(oldData, newData);

      // 如果没有实际变更，就不记录历史
      if (changes.length === 0) {
        console.log("No changes detected, skipping history record");
        return true;
      }
    }

    // 根据操作类型确定使用哪个数据作为快照
    let scriptSnapshot: ScriptSnapshot;
    if (operation === "delete" && oldData) {
      scriptSnapshot = createScriptSnapshot(oldData);
    } else if (newData) {
      scriptSnapshot = createScriptSnapshot(newData);
    } else if (oldData) {
      scriptSnapshot = createScriptSnapshot(oldData);
    } else {
      // 最小化快照
      scriptSnapshot = {
        scriptId,
        name: "",
        author: "",
      };
    }

    const response = await fetch("/api/edit-history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scriptId,
        operation,
        changes,
        description,
        scriptSnapshot,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to record edit history:", errorData);
      return false;
    }

    console.log(
      `Edit history recorded for ${operation} operation on script ${scriptId}`,
    );
    return true;
  } catch (error) {
    console.error("Error recording edit history:", error);
    return false;
  }
}
