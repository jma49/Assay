import { describe, expect, it } from "vitest";
import { redactConnectionString } from "./redact-connection-string";

describe("redactConnectionString", () => {
  it("masks the user and password in a postgres URL and keeps the rest", () => {
    expect(redactConnectionString("postgresql://owner:s3cret@ep-x.neon.tech/neondb?sslmode=require")).toBe(
      "postgresql://****@ep-x.neon.tech/neondb?sslmode=require",
    );
  });

  it("masks a user without a password", () => {
    expect(redactConnectionString("postgres://owner@host/db")).toBe("postgres://****@host/db");
  });

  it("masks a mongodb+srv URL", () => {
    expect(redactConnectionString("mongodb+srv://user:p%40ss@cluster.mongodb.net/?appName=App")).toBe(
      "mongodb+srv://****@cluster.mongodb.net/?appName=App",
    );
  });

  it("masks an unencoded @ in the password without leaking its tail", () => {
    const redacted = redactConnectionString("postgres://user:pa@ss@localhost:5432/db");
    expect(redacted).toBe("postgres://****@localhost:5432/db");
    expect(redacted).not.toContain("ss@");
  });

  it("handles multi-host URIs", () => {
    expect(redactConnectionString("mongodb://user:secret@h1:27017,h2:27017/db")).toBe("mongodb://****@h1:27017,h2:27017/db");
  });

  it("does not touch an @ in the query string", () => {
    expect(redactConnectionString("postgres://user:secret@host/db?note=a@b")).toBe("postgres://****@host/db?note=a@b");
    expect(redactConnectionString("postgres://host/db?note=a@b")).toBe("postgres://host/db?note=a@b");
  });

  it("masks passwords passed as query parameters", () => {
    expect(redactConnectionString("postgres://host/db?user=owner&password=s3cret&sslmode=require")).toBe(
      "postgres://host/db?user=owner&password=****&sslmode=require",
    );
    expect(redactConnectionString("postgres://host/db?sslpassword=k3y&PASSWORD=x#frag")).toBe("postgres://host/db?sslpassword=****&PASSWORD=****#frag");
  });

  it("leaves strings without credentials unchanged", () => {
    expect(redactConnectionString("postgres://localhost:5432/db")).toBe("postgres://localhost:5432/db");
    expect(redactConnectionString("")).toBe("");
  });
});
