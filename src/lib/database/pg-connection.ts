import type { ConnectionOptions } from "node:tls";

// libpq modes that ask for TLS. pg 8 treats all four as verify-full and warns
// that pg 9 will give prefer/require/verify-ca libpq's weaker meaning.
const TLS_MODES = new Set(["prefer", "require", "verify-ca", "verify-full"]);
// Parameters that pg turns into TLS settings of its own, which would replace ours.
const TLS_PARAMS = new Set(["sslmode", "uselibpqcompat", "ssl"]);
// Certificate files pg reads from disk; a URL naming them is left to pg.
const FILE_PARAMS = ["sslcert", "sslkey", "sslrootcert"];

export interface PgConnection {
  connectionString: string;
  ssl?: ConnectionOptions;
}

function paramName(pair: string): string {
  const name = pair.split("=", 1)[0];
  try {
    return decodeURIComponent(name.replace(/\+/g, " ")).toLowerCase();
  } catch {
    return name.toLowerCase();
  }
}

/**
 * The connection string and TLS options handed to pg. When DATABASE_URL asks
 * for TLS (`sslmode` prefer, require, verify-ca or verify-full), TLS is set
 * explicitly with full verification: the certificate chain against `ca`, or
 * the system CAs without one, and the host name (pg sends it as SNI and
 * Node checks it). The TLS parameters are removed from the string, so pg's
 * own reading of sslmode (and its deprecation warning) never applies.
 * `sslmode=disable`, `no-verify`, a URL without sslmode and one naming
 * certificate files keep pg's behaviour; `ca` is still used when given.
 */
export function pgConnection(connectionString: string, ca?: ConnectionOptions): PgConnection {
  const queryStart = connectionString.indexOf("?");
  if (queryStart === -1) return { connectionString, ssl: ca };
  const query = connectionString.slice(queryStart + 1);
  const params = new URLSearchParams(query);
  const sslmode = params.get("sslmode")?.toLowerCase();
  if (!sslmode || !TLS_MODES.has(sslmode) || FILE_PARAMS.some((name) => params.has(name))) {
    return { connectionString, ssl: ca };
  }
  const kept = query.split("&").filter((pair) => pair !== "" && !TLS_PARAMS.has(paramName(pair)));
  const base = connectionString.slice(0, queryStart);
  return {
    connectionString: kept.length ? `${base}?${kept.join("&")}` : base,
    ssl: ca ?? { rejectUnauthorized: true },
  };
}
