import { describe, expect, it } from "vitest";
import { toApprovalDto } from "./approval-dto";
import { ApprovalStatus, ScriptType } from "@/lib/types/approval";
import type { ApprovalRequest } from "@/server/repos/approval-store";

const base: ApprovalRequest = {
  requestId: "req_1",
  scriptId: "orders-check",
  requesterId: "user_dev",
  requesterEmail: "dev@example.com",
  scriptType: ScriptType.READ_ONLY,
  status: ApprovalStatus.PENDING,
  priority: "medium",
  title: "Orders",
  description: "Tighten the window",
  requestedAt: new Date("2026-09-01T10:00:00Z"),
  updatedAt: new Date("2026-09-01T10:00:00Z"),
  autoApprovalEligible: false,
  requiredApprovers: ["admin"],
  currentApprovers: [],
  operationType: "update",
  originalData: { sqlContent: "SELECT 2" },
  sqlContent: "SELECT 2",
};

describe("toApprovalDto", () => {
  it("carries the proposed SQL, the operation and the live SQL when given", () => {
    const dto = toApprovalDto(base, "SELECT 1");
    expect(dto).toMatchObject({
      id: "req_1",
      scriptName: "Orders",
      operationType: "update",
      sqlContent: "SELECT 2",
      currentSqlContent: "SELECT 1",
      isComplete: false,
      currentApprovers: [],
    });
  });

  it("falls back to the SQL inside the change for older requests", () => {
    const dto = toApprovalDto({ ...base, sqlContent: undefined, originalData: { sqlContent: "SELECT 3" } });
    expect(dto.sqlContent).toBe("SELECT 3");
    expect(dto).not.toHaveProperty("currentSqlContent");
  });

  it("names the reviewer of a decided request", () => {
    const dto = toApprovalDto({
      ...base,
      status: ApprovalStatus.REJECTED,
      reviewedBy: "user_admin",
      reviewerEmail: "admin@example.com",
      reviewComment: "too broad",
      reviewedAt: new Date("2026-09-02T10:00:00Z"),
    });
    expect(dto.currentApprovers).toEqual([
      {
        userId: "user_admin",
        email: "admin@example.com",
        role: "reviewer",
        decision: "rejected",
        comment: "too broad",
        timestamp: "2026-09-02T10:00:00.000Z",
      },
    ]);
  });

  it("names the check from the change, then the title, then the id", () => {
    expect(toApprovalDto({ ...base, originalData: { name: "Orders v2" } }).scriptName).toBe("Orders v2");
    expect(toApprovalDto({ ...base, title: "" }).scriptName).toBe("orders-check");
  });
});
