/** One edit-history entry as GET /api/edit-history returns it. */
export interface ScriptSnapshot {
  scriptId: string;
  name: string;
  cnName?: string;
  description?: string;
  cnDescription?: string;
  scope?: string;
  cnScope?: string;
  author: string;
  isScheduled?: boolean;
  cronSchedule?: string;
}

export interface EditHistoryRecord {
  _id?: string;
  operation: "create" | "update" | "delete";
  operationTime: Date;
  userId: string;
  userEmail?: string;
  userName?: string;

  // The check as it was, so history stays readable after the check is deleted.
  scriptSnapshot: ScriptSnapshot;
  changes?: {
    field: string;
    fieldDisplayName: string;
    fieldDisplayNameCn: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  description?: string;
  descriptionCn?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };

  // Lower-cased copies for filtering and search.
  searchableAuthor: string;
  searchableScriptName: string;
  searchableScriptNameCn: string;
  operationType: string;
}
export interface EditHistoryFilter {
  scriptName?: string;
  author?: string;
  operation?: "create" | "update" | "delete" | "all";
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: "operationTime" | "scriptName" | "author";
  sortOrder?: "asc" | "desc";
}
