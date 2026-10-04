import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { isIP, Socket } from "node:net";
import type { ConnectionOptions } from "node:tls";
import type { ClientConfig } from "pg";
import { pgConnection } from "@/lib/database/pg-connection";
import { dnsResolver, HostNotFoundError, isPrivateAddress, type Resolver } from "@/lib/net/safe-url";

/**
 * Connection strings for added data sources. An admin types the host, so
 * it could point at internal services or the cloud metadata endpoint
 * (SSRF): hosts on private networks are refused unless the deployment sets
 * ALLOW_PRIVATE_DATA_SOURCES=true, and every connection re-checks the
 * address it actually connects to (DNS rebinding). TLS with full
 * verification is required unless the host is private and allowed.
 */

export type ConnectionProblem =
  | "invalid_connection_string"
  | "unsupported_parameter"
  | "host_not_public"
  | "host_not_found"
  | "tls_required";

export class SourceConnectionError extends Error {
  constructor(
    readonly code: ConnectionProblem,
    message: string,
  ) {
    super(message);
  }
}

// Only parameters with no side effects outside the session. `host`/`hostaddr`
// would override the checked host, and the ssl file parameters read files
// from the server's disk.
const ALLOWED_PARAMS = new Set(["sslmode", "channel_binding", "application_name", "options", "connect_timeout"]);
const SSL_MODES = new Set(["disable", "allow", "prefer", "require", "verify-ca", "verify-full", "no-verify"]);
const WITHOUT_VERIFIED_TLS = new Set(["disable", "allow", "no-verify"]);

export interface ParsedConnection {
  /** The string as given; passed to pgConnection for its sslmode reading. */
  source: string;
  user: string;
  password: string;
  /** Without IPv6 brackets. */
  host: string;
  port: number;
  database: string;
  sslmode: string | null;
  params: Record<string, string>;
}

const invalid = (message: string) => new SourceConnectionError("invalid_connection_string", message);

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw invalid("The connection string has a malformed escape sequence");
  }
}

/** Parses a `postgres://user:password@host:port/database?…` URL; nothing else is accepted. */
export function parseConnectionString(value: string): ParsedConnection {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw invalid("Use the URL form: postgres://user:password@host:5432/database");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") throw invalid("The connection string must start with postgres:// or postgresql://");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host || host.includes(",")) throw invalid("Name exactly one host");
  const user = decode(url.username);
  if (!user) throw invalid("Name the user to connect as");
  const port = url.port ? Number(url.port) : 5432;

  const params: Record<string, string> = {};
  for (const [rawKey, rawValue] of url.searchParams) {
    const key = rawKey.toLowerCase();
    if (!ALLOWED_PARAMS.has(key)) throw new SourceConnectionError("unsupported_parameter", `The parameter "${rawKey}" is not supported`);
    params[key] = rawValue;
  }
  const sslmode = params.sslmode?.toLowerCase() ?? null;
  if (sslmode !== null && !SSL_MODES.has(sslmode)) throw invalid(`Unknown sslmode "${params.sslmode}"`);

  return {
    source: value.trim(),
    user,
    password: decode(url.password),
    host,
    port,
    database: decode(url.pathname.replace(/^\//, "")) || user,
    sslmode,
    params,
  };
}

/** What people see instead of the connection string: `user@host:port/database`, never the password. */
export function displayOf(connection: Pick<ParsedConnection, "user" | "host" | "port" | "database">): string {
  const host = isIP(connection.host) === 6 ? `[${connection.host}]` : connection.host;
  return `${connection.user}@${host}:${connection.port}/${connection.database}`;
}

/** The display of DATABASE_URL, which may use parameters an added source may not; null when it is not a URL. */
export function displayOfUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
    const user = decodeURIComponent(url.username);
    return displayOf({ user, host: url.hostname.replace(/^\[|\]$/g, ""), port: url.port ? Number(url.port) : 5432, database: database || user });
  } catch {
    return null;
  }
}

const PRIVATE_NAMES = /(^|\.)(localhost|local|internal)$/i;

/**
 * Whether the host is on a private network: a private IP, a name such as
 * localhost, or a name that resolves to any private address. Refused
 * (`host_not_public`) unless private hosts are allowed.
 */
export async function checkSourceHost(host: string, allowPrivate: boolean, resolve: Resolver = dnsResolver): Promise<{ isPrivate: boolean }> {
  let isPrivate = PRIVATE_NAMES.test(host);
  if (!isPrivate) {
    let addresses: string[];
    try {
      addresses = isIP(host) ? [host] : await resolve(host);
    } catch (cause) {
      if (new Set(["ENOTFOUND", "ENODATA", "EAI_NONAME", "EAI_NODATA"]).has((cause as { code?: string }).code ?? "")) {
        throw new SourceConnectionError("host_not_found", new HostNotFoundError(host).message);
      }
      throw cause;
    }
    isPrivate = addresses.length === 0 || addresses.some(isPrivateAddress);
  }
  if (isPrivate && !allowPrivate) {
    throw new SourceConnectionError("host_not_public", "The host is on a private network; set ALLOW_PRIVATE_DATA_SOURCES=true to allow it");
  }
  return { isPrivate };
}

/** Refuses plaintext or unverified TLS unless the host is private and private hosts are allowed. */
export function assertTlsPolicy(connection: ParsedConnection, isPrivate: boolean, allowPrivate: boolean): void {
  if (connection.sslmode && WITHOUT_VERIFIED_TLS.has(connection.sslmode) && !(isPrivate && allowPrivate)) {
    throw new SourceConnectionError("tls_required", "Connections to a public host must use verified TLS (sslmode=require or verify-full)");
  }
}

/** Validates a connection string the way saving and testing it do; resolves the host once. */
export async function vetConnectionString(value: string, allowPrivate: boolean, resolve?: Resolver): Promise<ParsedConnection> {
  const connection = parseConnectionString(value);
  const { isPrivate } = await checkSourceHost(connection.host, allowPrivate, resolve);
  assertTlsPolicy(connection, isPrivate, allowPrivate);
  return connection;
}

type LookupCallback = (error: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;
type DnsLookup = (hostname: string, options: { all: true }, callback: (error: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void) => void;

/**
 * A DNS lookup that fails for private addresses, used for every connection
 * to an added source: the address checked is the one connected to, so a
 * name that later resolves to an internal address is refused.
 */
export function publicOnlyLookup(lookup: DnsLookup = dnsLookup as unknown as DnsLookup) {
  return (hostname: string, options: { all?: boolean }, callback: LookupCallback): void => {
    lookup(hostname, { all: true }, (error, addresses) => {
      if (error) return callback(error, []);
      const [first] = addresses;
      if (!first || addresses.some((entry) => isPrivateAddress(entry.address))) {
        return callback(Object.assign(new Error(`The data source host ${hostname} is not public`), { code: "ENOTPUBLIC" }), []);
      }
      if (options.all) return callback(null, addresses);
      callback(null, first.address, first.family);
    });
  };
}

/**
 * A socket whose `connect(port, host)` (how pg connects) resolves the host
 * through `lookup`. pg still sees the host name, so TLS sends it as SNI
 * (Neon routes by it) and verifies the certificate against it.
 */
export function guardedSocket(lookup: ReturnType<typeof publicOnlyLookup>): Socket {
  const socket = new Socket();
  const connect = socket.connect.bind(socket) as (options: object) => Socket;
  socket.connect = ((port: number, host: string) => connect({ port, host, lookup })) as unknown as Socket["connect"];
  return socket;
}

interface ClientOptions {
  allowPrivate: boolean;
  connectTimeoutMs: number;
  lookup?: ReturnType<typeof publicOnlyLookup>;
}

/**
 * pg client settings for a vetted connection. TLS follows pgConnection for
 * the sslmodes that ask for it (full verification against the system CAs)
 * and is required with full verification when sslmode is missing; only a
 * private host with private hosts allowed may go without.
 */
export function clientConfig(connection: ParsedConnection, options: ClientOptions): ClientConfig {
  const { allowPrivate } = options;
  if (!allowPrivate && isIP(connection.host) && isPrivateAddress(connection.host)) {
    throw new SourceConnectionError("host_not_public", "The host is on a private network; set ALLOW_PRIVATE_DATA_SOURCES=true to allow it");
  }
  let ssl: ConnectionOptions | false;
  if (allowPrivate && (connection.sslmode === "disable" || connection.sslmode === "allow")) ssl = false;
  else if (allowPrivate && connection.sslmode === "no-verify") ssl = { rejectUnauthorized: false };
  else ssl = pgConnection(connection.source).ssl ?? { rejectUnauthorized: true };

  const { params } = connection;
  return {
    host: connection.host,
    port: connection.port,
    user: connection.user,
    password: connection.password,
    database: connection.database,
    ssl,
    application_name: params.application_name ?? "assay",
    ...(params.options && { options: params.options }),
    enableChannelBinding: params.channel_binding === "require" || params.channel_binding === "prefer",
    connectionTimeoutMillis: options.connectTimeoutMs,
    ...(!allowPrivate && { stream: () => guardedSocket(options.lookup ?? publicOnlyLookup()) }),
  };
}
