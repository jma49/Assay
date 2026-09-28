import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => ({
  guest: false,
  run: null as Record<string, unknown> | null,
  check: null as Record<string, unknown> | null,
}));

vi.mock("@/lib/auth/auth-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth-utils")>()),
  validateApiAuth: async () =>
    mocks.guest
      ? { isValid: true, user: { id: "guest_1", fullName: "Guest" }, userEmail: "", isGuest: true }
      : { isValid: true, user: { id: "user_viewer", fullName: null }, userEmail: "v@example.com", isGuest: false },
}));
vi.mock("@/lib/auth/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rbac")>()),
  requirePermission: async () => ({ authorized: true }),
}));
vi.mock("@/lib/database/mongodb", () => ({
  getMongoDbClient: () => ({
    getDb: async () => ({
      collection: (name: string) => ({ findOne: async () => (name === "runs" ? mocks.run : mocks.check) }),
    }),
  }),
}));

import { GET } from "./route";

const read = async (id: string) =>
  (await GET(new NextRequest(`http://localhost/api/execution-details/${id}`), { params: Promise.resolve({ resultId: id }) })).json();

describe("GET /api/execution-details/[resultId]", () => {
  const id = new ObjectId();

  beforeEach(() => {
    mocks.guest = false;
    mocks.run = { _id: id, checkId: "c", finishedAt: new Date(), outcome: "clean" };
    mocks.check = { name: "C", author: "ada@example.com" };
  });

  it("shows the check's author to members", async () => {
    expect((await read(String(id))).author).toBe("ada@example.com");
  });

  it("hides member handles from guests", async () => {
    mocks.guest = true;
    const body = await read(String(id));
    expect(body.author).toBe("Teammate");
    expect(JSON.stringify(body)).not.toContain("ada");
  });
});
