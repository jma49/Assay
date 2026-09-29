import { describe, expect, it } from "vitest";
import { pgConnection } from "./pg-connection";

const base = "postgresql://user:p%40ss@ep-demo.aws.neon.tech/neondb";

describe("pgConnection", () => {
  it.each(["require", "prefer", "verify-ca", "verify-full", "REQUIRE"])("verifies fully and drops sslmode=%s", (mode) => {
    const result = pgConnection(`${base}?sslmode=${mode}`);
    expect(result).toEqual({ connectionString: base, ssl: { rejectUnauthorized: true } });
  });

  it("keeps other parameters byte for byte and drops uselibpqcompat and ssl", () => {
    const result = pgConnection(`${base}?application_name=a%20b&sslmode=require&uselibpqcompat=true&ssl=true&channel_binding=require`);
    expect(result.connectionString).toBe(`${base}?application_name=a%20b&channel_binding=require`);
    expect(result.ssl).toEqual({ rejectUnauthorized: true });
  });

  it("uses the configured CA instead of the system CAs", () => {
    const ca = { ca: "pem", rejectUnauthorized: true };
    expect(pgConnection(`${base}?sslmode=require`, ca)).toEqual({ connectionString: base, ssl: ca });
    expect(pgConnection(base, ca)).toEqual({ connectionString: base, ssl: ca });
  });

  it.each([base, `${base}?sslmode=disable`, `${base}?sslmode=no-verify`, `${base}?sslmode=require&sslrootcert=/ca.pem`])(
    "leaves %s to pg",
    (url) => {
      expect(pgConnection(url)).toEqual({ connectionString: url, ssl: undefined });
    }
  );

  it("gives pg a string that no longer selects TLS on its own", () => {
    const { connectionString } = pgConnection(`${base}?sslmode=require&options=endpoint%3Dep-demo`);
    const parsed = new URL(connectionString);
    expect([...parsed.searchParams.keys()]).toEqual(["options"]);
    expect(parsed.searchParams.get("options")).toBe("endpoint=ep-demo");
    expect(decodeURIComponent(parsed.password)).toBe("p@ss");
  });
});
