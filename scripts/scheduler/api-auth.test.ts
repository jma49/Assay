import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { createApiTokenGuard } from "./api-auth";

const call = (
  token: string | undefined,
  path: string,
  authorization?: string
) => {
  const req = { path, headers: { authorization } } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn() as NextFunction;

  createApiTokenGuard(token)(req, res as unknown as Response, next);

  const status = res.status.mock.calls[0]?.[0];
  return { passed: vi.mocked(next).mock.calls.length === 1, status };
};

describe("createApiTokenGuard", () => {
  it("allows /health without a token", () => {
    expect(call("secret", "/health").passed).toBe(true);
    expect(call(undefined, "/health").passed).toBe(true);
  });

  it("disables management routes when no token is configured", () => {
    expect(call(undefined, "/tasks", "Bearer anything")).toEqual({
      passed: false,
      status: 503,
    });
  });

  it("rejects missing, malformed and wrong tokens", () => {
    expect(call("secret", "/tasks").status).toBe(401);
    expect(call("secret", "/tasks", "secret").status).toBe(401);
    expect(call("secret", "/tasks", "Bearer wrong").status).toBe(401);
    expect(call("secret", "/tasks", "Bearer secret-longer").status).toBe(401);
  });

  it("accepts the configured token", () => {
    expect(call("secret", "/reload", "Bearer secret").passed).toBe(true);
  });
});
