import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "mongodb";
import type { ApprovalRequest } from "@/server/repos/approval-store";

const store = vi.hoisted(() => ({
  request: null as Record<string, unknown> | null,
  decided: true,
  insertApprovalRequest: vi.fn(),
  decideApprovalRequest: vi.fn(),
  recordApplyError: vi.fn(),
}));
const writes = vi.hoisted(() => ({
  createCheck: vi.fn(async () => "mongo_1"),
  updateCheck: vi.fn(async () => ({ kind: "updated" }) as { kind: string }),
  deleteCheck: vi.fn(async () => true),
}));

vi.mock("@/server/repos/approval-store", () => ({
  insertApprovalRequest: store.insertApprovalRequest,
  findApprovalRequest: async () => store.request,
  decideApprovalRequest: (...args: unknown[]) => (store.decideApprovalRequest(...args), store.decided),
  recordApplyError: store.recordApplyError,
  listPendingRequests: vi.fn(),
  listDecidedRequests: vi.fn(),
  currentSqlOf: vi.fn(),
}));
vi.mock("./check-writes", () => writes);

import { UserRole } from "@/lib/auth/rbac";
import { approveRequest, fileChangeRequest, needsReview, rejectRequest } from "./approvals";

const db = {} as Db;
const DEV = { id: "u_dev", email: "dev@example.com" };
const ADMIN = { id: "u_admin", email: "admin@example.com" };

const pending = (overrides: Partial<ApprovalRequest> = {}) => ({
  requestId: "req_1",
  scriptId: "orders",
  requesterId: DEV.id,
  requesterEmail: DEV.email,
  status: "pending",
  operationType: "create",
  originalData: { name: "Orders", sqlContent: "SELECT 1", demoSeed: true, createdBy: { id: "u_mallory" } },
  ...overrides,
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  store.request = pending();
  store.decided = true;
  for (const fn of [store.insertApprovalRequest, store.decideApprovalRequest, store.recordApplyError, ...Object.values(writes)]) fn.mockClear();
  writes.updateCheck.mockResolvedValue({ kind: "updated" });
  writes.deleteCheck.mockResolvedValue(true);
});

describe("fileChangeRequest", () => {
  const change = (role: UserRole, sqlContent = "SELECT 1") => ({
    scriptId: "orders",
    requester: DEV,
    role,
    sqlContent,
    title: "Edit check: Orders",
    description: "",
    priority: "medium" as const,
    operationType: "update" as const,
    originalData: { name: "Orders" },
  });

  it("files a pending request for everyone but admins", async () => {
    expect(needsReview(UserRole.DEVELOPER)).toBe(true);
    expect(needsReview(UserRole.ADMIN)).toBe(false);
    const requestId = await fileChangeRequest(db, change(UserRole.DEVELOPER));
    const filed = store.insertApprovalRequest.mock.calls[0]?.[1] as ApprovalRequest;
    expect(filed).toMatchObject({ requestId, status: "pending", requiredApprovers: ["admin"], currentApprovers: [], scriptType: "read_only" });
    expect(requestId).toMatch(/^req_/);
  });

  it("records an admin's change as approved by the system", async () => {
    await fileChangeRequest(db, change(UserRole.ADMIN));
    const filed = store.insertApprovalRequest.mock.calls[0]?.[1] as ApprovalRequest;
    expect(filed).toMatchObject({ status: "approved", reviewedBy: "system", currentApprovers: ["system"], autoApprovalEligible: true });
  });

  it("classifies the SQL for the review record", async () => {
    await fileChangeRequest(db, change(UserRole.DEVELOPER, "GRANT ALL ON t TO x"));
    await fileChangeRequest(db, change(UserRole.DEVELOPER, "drop table t"));
    await fileChangeRequest(db, change(UserRole.DEVELOPER, "delete from t"));
    const types = store.insertApprovalRequest.mock.calls.map((call) => (call[1] as ApprovalRequest).scriptType);
    expect(types).toEqual(["system_admin", "structure_change", "data_modification"]);
  });
});

describe("approveRequest", () => {
  it("applies a create as the requester, with only the editable fields", async () => {
    await approveRequest(db, "req_1", ADMIN, "ok");
    expect(store.decideApprovalRequest).toHaveBeenCalledWith(db, "req_1", "approved", ADMIN, "ok");
    const [, doc, actor] = writes.createCheck.mock.calls[0] as unknown as [Db, Record<string, unknown>, unknown];
    expect(actor).toEqual(DEV);
    expect(doc).toMatchObject({ scriptId: "orders", name: "Orders", createdBy: DEV, version: 1, approvalRequestId: "req_1" });
    expect(doc).not.toHaveProperty("demoSeed");
  });

  it("refuses unknown, decided and own requests before deciding anything", async () => {
    store.request = null;
    await expect(approveRequest(db, "req_x", ADMIN)).rejects.toMatchObject({ code: "request_not_found" });
    store.request = pending({ status: "rejected" as never });
    await expect(approveRequest(db, "req_1", ADMIN)).rejects.toMatchObject({ code: "already_decided" });
    store.request = pending({ requesterId: ADMIN.id });
    await expect(approveRequest(db, "req_1", ADMIN)).rejects.toMatchObject({ code: "own_request" });
    expect(store.decideApprovalRequest).not.toHaveBeenCalled();
  });

  it("applies nothing when another reviewer decided first", async () => {
    store.decided = false;
    await expect(approveRequest(db, "req_1", ADMIN)).rejects.toMatchObject({ code: "already_decided" });
    expect(writes.createCheck).not.toHaveBeenCalled();
  });

  it("applies an edit only onto the version it was made against, and records a failure on the request", async () => {
    store.request = pending({ operationType: "update", originalData: { name: "Renamed", baseVersion: 3 } });
    writes.updateCheck.mockResolvedValueOnce({ kind: "conflict" });
    await expect(approveRequest(db, "req_1", ADMIN)).rejects.toMatchObject({ code: "apply_failed" });
    expect((writes.updateCheck.mock.calls[0] as unknown[])[3]).toBe(3);
    expect(store.recordApplyError).toHaveBeenCalledWith(db, "req_1", expect.stringContaining("submit the change again"));
  });

  it("reports a delete of a check that is already gone", async () => {
    store.request = pending({ operationType: "delete" });
    writes.deleteCheck.mockResolvedValueOnce(false);
    await expect(approveRequest(db, "req_1", ADMIN)).rejects.toMatchObject({ code: "apply_failed" });
  });
});

describe("rejectRequest", () => {
  it("rejects a pending request with the reason and applies nothing", async () => {
    await rejectRequest(db, "req_1", ADMIN, "too broad");
    expect(store.decideApprovalRequest).toHaveBeenCalledWith(db, "req_1", "rejected", ADMIN, "too broad");
    expect(writes.createCheck).not.toHaveBeenCalled();
  });

  it("loses to a reviewer who decided first", async () => {
    store.decided = false;
    await expect(rejectRequest(db, "req_1", ADMIN, "no")).rejects.toMatchObject({ code: "already_decided" });
  });
});
