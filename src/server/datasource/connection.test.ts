import { Socket } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertTlsPolicy,
  checkSourceHost,
  clientConfig,
  displayOf,
  displayOfUrl,
  guardedSocket,
  parseConnectionString,
  publicOnlyLookup,
  SourceConnectionError,
  vetConnectionString,
} from "./connection";

const NEON = "postgresql://reader:s3cret@ep-cool-lab-123.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const publicDns = async () => ["3.18.12.40"];

async function problem(promise: Promise<unknown> | (() => unknown)): Promise<string | undefined> {
  try {
    await (typeof promise === "function" ? promise() : promise);
  } catch (error) {
    return error instanceof SourceConnectionError ? error.code : `unexpected: ${error}`;
  }
  return undefined;
}

describe("parseConnectionString", () => {
  it("reads a Neon URL", () => {
    expect(parseConnectionString(NEON)).toMatchObject({
      user: "reader",
      password: "s3cret",
      host: "ep-cool-lab-123.us-east-2.aws.neon.tech",
      port: 5432,
      database: "neondb",
      sslmode: "require",
      params: { sslmode: "require", channel_binding: "require" },
    });
  });

  it("decodes escaped credentials and IPv6 hosts", () => {
    expect(parseConnectionString("postgres://a%40b:p%2Fw@[2001:db8::1]:6543/db")).toMatchObject({ user: "a@b", password: "p/w", host: "2001:db8::1", port: 6543 });
  });

  it.each([
    ["mysql://u:p@h/db", "invalid_connection_string"],
    ["host=db user=u", "invalid_connection_string"],
    ["postgres://h/db", "invalid_connection_string"],
    ["postgres://u@h/db?sslmode=bogus", "invalid_connection_string"],
    // Parameters that would move the connection elsewhere or read the server's files.
    ["postgres://u@db.example.com/db?host=169.254.169.254", "unsupported_parameter"],
    ["postgres://u@db.example.com/db?hostaddr=10.0.0.1", "unsupported_parameter"],
    ["postgres://u@db.example.com/db?sslrootcert=/etc/passwd", "unsupported_parameter"],
    ["postgres://u@db.example.com/db?sslkey=/root/.ssh/id_rsa", "unsupported_parameter"],
  ])("refuses %s", async (value, code) => {
    expect(await problem(() => parseConnectionString(value))).toBe(code);
  });

  it("displays user, host, port and database, never the password", () => {
    const display = displayOf(parseConnectionString(NEON));
    expect(display).toBe("reader@ep-cool-lab-123.us-east-2.aws.neon.tech:5432/neondb");
    expect(displayOf(parseConnectionString("postgres://u:x@[::1]/d"))).toBe("u@[::1]:5432/d");
    expect(displayOfUrl("postgres://owner:pw@db.internal:5433/prod?sslrootcert=/ca.pem")).toBe("owner@db.internal:5433/prod");
    expect(displayOfUrl("not a url")).toBeNull();
  });
});

describe("checkSourceHost", () => {
  it.each(["127.0.0.1", "10.1.2.3", "169.254.169.254", "::1", "localhost", "db.internal", "printer.local"])("refuses the private host %s", async (host) => {
    expect(await problem(checkSourceHost(host, false, publicDns))).toBe("host_not_public");
  });

  it("refuses a public-looking name that resolves to a private address", async () => {
    expect(await problem(checkSourceHost("metadata.attacker.example", false, async () => ["3.3.3.3", "169.254.169.254"]))).toBe("host_not_public");
  });

  it("accepts a public host, and a private one when private hosts are allowed", async () => {
    expect(await checkSourceHost("db.example.com", false, publicDns)).toEqual({ isPrivate: false });
    expect(await checkSourceHost("10.1.2.3", true, publicDns)).toEqual({ isPrivate: true });
  });

  it("says when the host does not exist", async () => {
    const missing = async () => {
      throw Object.assign(new Error("nope"), { code: "ENOTFOUND" });
    };
    expect(await problem(checkSourceHost("typo.example.com", false, missing))).toBe("host_not_found");
  });
});

describe("TLS policy", () => {
  it("requires verified TLS for a public host", async () => {
    for (const mode of ["disable", "allow", "no-verify"]) {
      expect(await problem(vetConnectionString(`postgres://u@db.example.com/d?sslmode=${mode}`, false, publicDns))).toBe("tls_required");
    }
    expect(await problem(vetConnectionString("postgres://u@db.example.com/d", false, publicDns))).toBeUndefined();
  });

  it("allows plaintext only to a private host with private hosts allowed", () => {
    const plain = parseConnectionString("postgres://u@10.0.0.5/d?sslmode=disable");
    expect(() => assertTlsPolicy(plain, true, true)).not.toThrow();
    expect(() => assertTlsPolicy(plain, false, true)).toThrow(SourceConnectionError);
  });
});

describe("clientConfig", () => {
  it("verifies TLS fully, by the host name, when sslmode asks for it or is missing", () => {
    for (const url of [NEON, "postgres://u:p@db.example.com/d"]) {
      const config = clientConfig(parseConnectionString(url), { allowPrivate: false, connectTimeoutMs: 5000 });
      expect(config.ssl).toEqual({ rejectUnauthorized: true });
      // pg sends the host as SNI and verifies the certificate against it; the host stays the name, not an address.
      expect(config.host).toBe(new URL(url).hostname);
    }
  });

  it("never passes a connection string, so no parameter can override the checked host", () => {
    const config = clientConfig(parseConnectionString(NEON), { allowPrivate: false, connectTimeoutMs: 5000 });
    expect(config).not.toHaveProperty("connectionString");
    expect(config).toMatchObject({ user: "reader", password: "s3cret", database: "neondb", port: 5432, enableChannelBinding: true, connectionTimeoutMillis: 5000 });
  });

  it("connects through the public-only lookup unless private hosts are allowed", () => {
    const guarded = clientConfig(parseConnectionString(NEON), { allowPrivate: false, connectTimeoutMs: 5000 });
    expect(typeof guarded.stream).toBe("function");
    const open = clientConfig(parseConnectionString(NEON), { allowPrivate: true, connectTimeoutMs: 5000 });
    expect(open.stream).toBeUndefined();
  });

  it("uses plaintext or unverified TLS only when private hosts are allowed", () => {
    const plain = parseConnectionString("postgres://u@10.0.0.5/d?sslmode=disable");
    expect(clientConfig(plain, { allowPrivate: true, connectTimeoutMs: 1 }).ssl).toBe(false);
    expect(clientConfig(parseConnectionString("postgres://u@10.0.0.5/d?sslmode=no-verify"), { allowPrivate: true, connectTimeoutMs: 1 }).ssl).toEqual({
      rejectUnauthorized: false,
    });
  });

  it("refuses a private address saved while private hosts were allowed, once they no longer are", () => {
    expect(() => clientConfig(parseConnectionString("postgres://u@10.0.0.5/d"), { allowPrivate: false, connectTimeoutMs: 1 })).toThrow(SourceConnectionError);
  });
});

describe("publicOnlyLookup (DNS rebinding)", () => {
  type Answer = { address: string; family: number }[];
  const dns = (answer: Answer) => (_host: string, _options: { all: true }, callback: (error: null, addresses: Answer) => void) => callback(null, answer);

  it("fails the connection when the name now resolves to a private address", async () => {
    const lookup = publicOnlyLookup(dns([{ address: "169.254.169.254", family: 4 }]));
    const error = await new Promise<NodeJS.ErrnoException | null>((resolve) => lookup("db.example.com", {}, (e) => resolve(e)));
    expect(error?.code).toBe("ENOTPUBLIC");
  });

  it("hands over the checked public addresses, one or all", async () => {
    const lookup = publicOnlyLookup(dns([{ address: "3.18.12.40", family: 4 }, { address: "3.18.12.41", family: 4 }]));
    const one = await new Promise((resolve) => lookup("db.example.com", {}, (_e, address, family) => resolve([address, family])));
    expect(one).toEqual(["3.18.12.40", 4]);
    const all = await new Promise((resolve) => lookup("db.example.com", { all: true }, (_e, addresses) => resolve(addresses)));
    expect(all).toHaveLength(2);
  });
});

describe("guardedSocket", () => {
  afterEach(() => vi.restoreAllMocks());

  it("resolves the host pg connects to through the lookup it was given", () => {
    const connect = vi.spyOn(Socket.prototype, "connect").mockImplementation(function (this: Socket) {
      return this;
    });
    const lookup = publicOnlyLookup();
    guardedSocket(lookup).connect(5432, "db.example.com");
    expect(connect).toHaveBeenCalledWith({ port: 5432, host: "db.example.com", lookup });
  });
});
