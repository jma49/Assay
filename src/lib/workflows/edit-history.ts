import { sourceIdOf } from "@/domain/data-source";
import { ScriptSnapshot } from "@/contracts/edit-history";

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

/** The tracked fields that differ between two versions of a check. */
function getObjectChanges(
  oldObj: Record<string, unknown> | null | undefined,
  newObj: Record<string, unknown> | null | undefined,
): ChangeDetail[] {
  const changes: ChangeDetail[] = [];
  const allKeys = new Set([
    ...Object.keys(oldObj || {}),
    ...Object.keys(newObj || {}),
  ]);
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
    "dataSourceId",
  ];

  for (const key of allKeys) {
    if (!trackedFields.includes(key)) continue;

    const oldValue = oldObj?.[key];
    const newValue = newObj?.[key];
    // A check without a source runs against `default`; setting it explicitly changes nothing.
    const same =
      key === "dataSourceId" ? sourceIdOf(oldObj) === sourceIdOf(newObj) : normalizeValue(oldValue) === normalizeValue(newValue);
    if (!same) {
      changes.push({
        field: key,
        oldValue: oldValue,
        newValue: newValue,
      });
    }
  }

  return changes;
}

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "boolean") {
    return value.toString();
  }
  return String(value).trim();
}

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
