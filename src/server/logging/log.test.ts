import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { currentRequestId, logError, logInfo, logWarn, runWithRequestId } from "./log";

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
    expect(lines[0].startsWith("warn:")).toBe(true);
    expect(lines[1].startsWith("error:")).toBe(true);
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
});
