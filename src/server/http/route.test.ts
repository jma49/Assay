import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError, errorResponse, parseJson } from "./route";

describe("errorResponse", () => {
  it("passes an ApiError through with its status and code", async () => {
    const res = errorResponse(new ApiError(409, "conflict", "Changed elsewhere"));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: { code: "conflict", message: "Changed elsewhere" } });
  });

  it("turns anything else into a generic 500 without internals", async () => {
    const res = errorResponse(new Error("connection string postgres://secret"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});

describe("parseJson", () => {
  const schema = z.object({ scriptId: z.string().min(1) });

  it("returns the parsed body", async () => {
    const req = new Request("http://x", { method: "POST", body: JSON.stringify({ scriptId: "a" }) });
    expect(await parseJson(req, schema)).toEqual({ scriptId: "a" });
  });

  it("rejects invalid JSON and invalid shapes as 400s", async () => {
    const notJson = new Request("http://x", { method: "POST", body: "{" });
    await expect(parseJson(notJson, schema)).rejects.toMatchObject({ status: 400, code: "invalid_json" });
    const wrong = new Request("http://x", { method: "POST", body: JSON.stringify({ scriptId: "" }) });
    const res = await parseJson(wrong, schema).catch(errorResponse);
    expect((res as Response).status).toBe(400);
  });
});
