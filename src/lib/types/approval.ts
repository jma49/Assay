export enum ApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  WITHDRAWN = "withdrawn",
}
export enum ScriptType {
  READ_ONLY = "read_only",
  DATA_MODIFICATION = "data_modification",
  STRUCTURE_CHANGE = "structure_change",
  SYSTEM_ADMIN = "system_admin",
}

// The approval request as the pages receive it.
export interface ApprovalRequestDto {
  id: string;
  scriptId: string;
  scriptName: string;
  scriptType: ScriptType;
  status: ApprovalStatus;
  requesterEmail: string;
  requesterId: string;
  createdAt: string;
  updatedAt: string;
  requiredApprovers: string[];
  currentApprovers: Array<{
    userId: string;
    email: string;
    role: string;
    decision: "approved" | "rejected";
    comment?: string;
    timestamp: string;
  }>;
  isComplete: boolean;
  comment?: string;
  operationType?: "create" | "update" | "delete";
  /** The SQL the request would put live (for a delete, the SQL being removed). */
  sqlContent?: string;
  /** The check's live SQL, sent with pending edits so reviewers can see the diff. */
  currentSqlContent?: string;
  /** The data source the change makes the check run against, when it names one. */
  dataSourceId?: string;
}
export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager",
  DEVELOPER = "developer",
  VIEWER = "viewer",
}
