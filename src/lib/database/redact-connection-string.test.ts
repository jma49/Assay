import { describe, expect, it } from "vitest";
import { redactConnectionString } from "./redact-connection-string";

describe("redactConnectionString", () => {
  it("masks the password in a postgres URL and keeps the rest", () => {
    expect(
      redactConnectionString(
        "postgresql://owner:s3cret@ep-x.neon.tech/neondb?sslmode=require"
      )
    ).toBe("postgresql://owner:****@ep-x.neon.tech/neondb?sslmode=require");
  });

  it("masks the password in a mongodb+srv URL", () => {
    expect(
      redactConnectionString(
        "mongodb+srv://user:p%40ss@cluster.mongodb.net/?appName=App"
      )
    ).toBe("mongodb+srv://user:****@cluster.mongodb.net/?appName=App");
  });

  it("masks an unencoded @ in the password without leaking its tail", () => {
    const redacted = redactConnectionString(
      "postgres://user:pa@ss@localhost:5432/db"
    );
    expect(redacted).toBe("postgres://user:****@localhost:5432/db");
    expect(redacted).not.toContain("ss@");
  });

  it("handles multi-host URIs", () => {
    expect(
      redactConnectionString("mongodb://user:secret@h1:27017,h2:27017/db")
    ).toBe("mongodb://user:****@h1:27017,h2:27017/db");
  });

  it("does not touch an @ in the query string", () => {
    expect(
      redactConnectionString("postgres://user:secret@host/db?note=a@b")
    ).toBe("postgres://user:****@host/db?note=a@b");
  });

  it("leaves strings without credentials unchanged", () => {
    expect(redactConnectionString("postgres://localhost:5432/db")).toBe(
      "postgres://localhost:5432/db"
    );
    expect(redactConnectionString("")).toBe("");
  });
});
