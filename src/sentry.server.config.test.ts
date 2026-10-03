import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { scrubPostgresError, scrubPostgresEvent } from "./sentry.server.config";

function pgError(): Record<string, unknown> {
  return {
    message: "duplicate key value violates unique constraint",
    name: "error",
    code: "23505",
    detail: "Key (email)=(someone@example.com) already exists.",
    hint: "a hint with data",
    internalQuery: "SELECT password FROM users WHERE email = 'x'",
    where: "PL/pgSQL function inline_0",
    internalPosition: "42",
    table: "users",
    severity: "ERROR",
  };
}

describe("scrubPostgresError", () => {
  it("removes the pg data-carrying fields but keeps code and metadata", () => {
    const error = pgError();
    scrubPostgresError(error);
    for (const field of ["detail", "hint", "internalQuery", "where", "internalPosition"]) {
      expect(error[field], field).toBeUndefined();
    }
    expect(error["code"]).toBe("23505");
    expect(error["table"]).toBe("users");
  });

  it("leaves non-pg errors alone", () => {
    const plain = new Error("boom");
    scrubPostgresError(plain);
    expect(plain.message).toBe("boom");

    const numericCode = { code: 11000, detail: "mongo detail" };
    scrubPostgresError(numericCode);
    expect(numericCode.detail).toBe("mongo detail");

    expect(() => scrubPostgresError(null)).not.toThrow();
    expect(() => scrubPostgresError(undefined)).not.toThrow();
    expect(() => scrubPostgresError("23505")).not.toThrow();
  });
});

describe("scrubPostgresEvent", () => {
  it("scrubs the live error and its serialized copies in frame vars", () => {
    const error = pgError();
    const event = {
      exception: {
        values: [
          {
            type: "error",
            value: "duplicate key value",
            stacktrace: {
              frames: [
                {
                  function: "query",
                  vars: { err: { code: "23505", detail: "Key (email)=(someone@example.com) already exists." } },
                },
                { function: "other", vars: { ok: 1 } },
                { function: "novars" },
              ],
            },
          },
        ],
      },
    } as unknown as ErrorEvent;
    const result = scrubPostgresEvent(event, { originalException: error });
    expect(result).toBe(event);
    expect(error["detail"]).toBeUndefined();
    const frames = event.exception!.values![0]!.stacktrace!.frames!;
    expect((frames[0]!.vars as Record<string, unknown>)["err"]).toEqual({ code: "23505" });
    expect(frames[1]!.vars).toEqual({ ok: 1 });
  });

  it("returns the event untouched when the error is not a pg error", () => {
    const event = { exception: { values: [] } } as unknown as ErrorEvent;
    expect(scrubPostgresEvent(event, { originalException: new Error("boom") })).toBe(event);
    expect(scrubPostgresEvent(event, undefined)).toBe(event);
  });
});
