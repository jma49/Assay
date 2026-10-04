import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { currentRequestId, logError, logInfo, logWarn, redactUrlCredentials, runWithRequestId, scrub } from "./log";

describe("structured logs", () => {
  const lines: string[] = [];
  beforeEach(() => {
    lines.length = 0;
    const capture = (prefix: string) => (...args: unknown[]) => {
      lines.push(`${prefix}:${String(args[0])}`);
    };
    vi.spyOn(console, "log").mockImplementation(capture("log"));
    vi.spyOn(console, "warn").mockImplementation(capture("warn"));
    vi.spyOn(console, "error").mockImplementation(capture("error"));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const lastEntry = (): Record<string, unknown> => {
    const line = lines.at(-1) ?? "";
    return JSON.parse(line.slice(line.indexOf(":") + 1)) as Record<string, unknown>;
  };

  it("emits JSON with level, message, fields and timestamp", () => {
    logInfo("check finished", { check: "c1" });
    const entry = lastEntry();
    expect(entry["level"]).toBe("info");
    expect(entry["msg"]).toBe("check finished");
    expect(entry["check"]).toBe("c1");
    expect(typeof entry["ts"]).toBe("string");
    expect(entry["requestId"]).toBeUndefined();
  });

  it("routes warn and error to their own console methods", () => {
    logWarn("slow query");
    logError("query failed");
    expect(lines[0]?.startsWith("warn:")).toBe(true);
    expect(lines[1]?.startsWith("error:")).toBe(true);
  });

  it("attaches the request id inside runWithRequestId", () => {
    runWithRequestId("req-1", () => logWarn("slow query"));
    expect(lastEntry()["requestId"]).toBe("req-1");
  });

  it("prefers the innermost id when contexts nest", () => {
    runWithRequestId("outer", () => {
      runWithRequestId("inner", () => logError("boom"));
    });
    expect(lastEntry()["requestId"]).toBe("inner");
  });

  it("has no id once the context ends", () => {
    runWithRequestId("req-1", () => undefined);
    expect(currentRequestId()).toBeUndefined();
    logInfo("after");
    expect(lastEntry()["requestId"]).toBeUndefined();
  });

  it("writes an error's name, message, code and stack instead of {}", () => {
    const error = Object.assign(new Error("connect ECONNREFUSED postgres://app:hunter2@db.internal:5432/x"), { code: "ECONNREFUSED" });
    logError("[db] connect failed", { error });
    const logged = lastEntry()["error"] as Record<string, unknown>;
    expect(logged).toMatchObject({ name: "Error", code: "ECONNREFUSED", message: "connect ECONNREFUSED postgres://[redacted]@db.internal:5432/x" });
    expect(String(logged["stack"])).toContain("log.test.ts");
    expect(JSON.stringify(lastEntry())).not.toContain("hunter2");
  });

  it("redacts sensitive keys in emitted log fields", () => {
    logWarn("login", {
      user: "u1",
      password: "hunter2",
      DB_PASSWORD: "hunter3",
      apiKey: "key-1",
      api_key: "key-2",
      accessToken: "tok",
      clientSecret: "s3cr3t",
      connectionString: "postgresql://u:p@host/db",
      userEmail: "someone@example.com",
      authorization: "Bearer abc",
    });
    const entry = lastEntry();
    expect(entry["user"]).toBe("u1");
    for (const key of [
      "password",
      "DB_PASSWORD",
      "apiKey",
      "api_key",
      "accessToken",
      "clientSecret",
      "connectionString",
      "userEmail",
      "authorization",
    ]) {
      expect(entry[key], key).toBe("[redacted]");
    }
  });
});

describe("scrub", () => {
  it("redacts nested objects and arrays", () => {
    const out = scrub({
      config: { nested: { token: "tok", keep: 1 } },
      list: [{ secret: "s" }, "plain"],
    }) as Record<string, unknown>;
    expect(out["config"]).toEqual({ nested: { token: "[redacted]", keep: 1 } });
    expect(out["list"]).toEqual([{ secret: "[redacted]" }, "plain"]);
  });

  it("leaves non-plain values and ordinary keys alone", () => {
    const date = new Date("2026-10-02T00:00:00Z");
    const out = scrub({ at: date, count: 3, name: "check" }) as Record<string, unknown>;
    expect(out["at"]).toBe(date);
    expect(out["count"]).toBe(3);
    expect(out["name"]).toBe("check");
    expect(scrub("token")).toBe("token");
    expect(scrub(null)).toBeNull();
  });
});

describe("redactUrlCredentials", () => {
  it("hides user and password in URLs, and leaves URLs without them alone", () => {
    expect(redactUrlCredentials("mongodb+srv://u:p@cluster.example.net/db")).toBe("mongodb+srv://[redacted]@cluster.example.net/db");
    expect(redactUrlCredentials("postgres://reader@host/db failed")).toBe("postgres://[redacted]@host/db failed");
    expect(redactUrlCredentials("see https://assay.example.com/docs")).toBe("see https://assay.example.com/docs");
  });
});
