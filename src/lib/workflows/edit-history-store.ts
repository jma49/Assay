import { getMongoDbClient } from "../database/mongodb";
import {
  ChangeDetail,
  RecordEditHistoryParams,
  buildEditHistoryEntry,
} from "./edit-history";
import { EditHistoryRecord, ScriptSnapshot } from "@/contracts/edit-history";
import { COLLECTIONS } from "@/lib/database/collections";
import { logError } from "@/lib/logging/log";

export interface EditHistoryActor {
  id: string;
  email: string;
  name: string;
}

const FIELD_DISPLAY_NAMES: Record<string, { en: string; cn: string }> = {
  name: { en: "Check name", cn: "检查名称" },
  cnName: { en: "Check name (CN)", cn: "中文名称" },
  description: { en: "Description", cn: "描述" },
  cnDescription: { en: "Description (CN)", cn: "中文描述" },
  scope: { en: "Scope", cn: "作用域" },
  cnScope: { en: "Scope (CN)", cn: "中文作用域" },
  author: { en: "Author", cn: "作者" },
  isScheduled: { en: "Scheduled", cn: "是否定时执行" },
  cronSchedule: { en: "Cron Schedule", cn: "定时设置" },
  sqlContent: { en: "SQL Content", cn: "SQL内容" },
  dataSourceId: { en: "Data source", cn: "数据源" },
};

function defaultDescriptions(
  operation: RecordEditHistoryParams["operation"],
  scriptId: string,
  changedFields: number,
): { en: string; cn: string } {
  switch (operation) {
    case "create":
      return { en: `Created check ${scriptId}`, cn: `创建了检查 ${scriptId}` };
    case "update":
      return {
        en: `Updated check ${scriptId}, changed ${changedFields} fields`,
        cn: `更新了检查 ${scriptId}，变更了 ${changedFields} 个字段`,
      };
    case "delete":
      return { en: `Deleted check ${scriptId}`, cn: `删除了检查 ${scriptId}` };
  }
}

/** Inserts one edit_history record. Server only. */
async function insertEditHistory(entry: {
  scriptId: string;
  operation: RecordEditHistoryParams["operation"];
  changes: ChangeDetail[];
  scriptSnapshot: ScriptSnapshot;
  description?: string;
  actor: EditHistoryActor;
}): Promise<string> {
  const changes = entry.changes.map((change) => {
    const names = FIELD_DISPLAY_NAMES[change.field] || { en: change.field, cn: change.field };
    return { ...change, fieldDisplayName: names.en, fieldDisplayNameCn: names.cn };
  });
  const defaults = defaultDescriptions(entry.operation, entry.scriptId, changes.length);

  const record: Omit<EditHistoryRecord, "_id"> = {
    operation: entry.operation,
    operationTime: new Date(),
    userId: entry.actor.id,
    userEmail: entry.actor.email,
    userName: entry.actor.name,
    scriptSnapshot: entry.scriptSnapshot,
    changes,
    description: entry.description || defaults.en,
    descriptionCn: entry.description || defaults.cn,
    searchableAuthor: entry.scriptSnapshot.author?.toLowerCase() || "",
    searchableScriptName: entry.scriptSnapshot.name?.toLowerCase() || "",
    searchableScriptNameCn: entry.scriptSnapshot.cnName?.toLowerCase() || "",
    operationType: entry.operation,
  };

  const db = await getMongoDbClient().getDb();
  const result = await db.collection(COLLECTIONS.editHistory).insertOne(record);
  return String(result.insertedId);
}

/**
 * Records a script change from server code (API routes, approval workflow).
 * Never throws: history must not break the write it describes.
 */
export async function recordEditHistoryOnServer(
  params: RecordEditHistoryParams,
  actor: EditHistoryActor,
): Promise<boolean> {
  try {
    const entry = buildEditHistoryEntry(params);
    if (!entry) return true; // update without tracked changes
    await insertEditHistory({ ...entry, scriptId: params.scriptId, operation: params.operation, description: params.description, actor });
    return true;
  } catch (error) {
    logError("Error recording edit history", { error });
    return false;
  }
}
