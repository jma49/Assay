import redis from "../cache/redis";
import type { SchemaTable } from "@/contracts/schema";
import { withReadOnlyTransaction } from "./db";

interface ColumnRow {
  table_schema: string;
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
}

const CACHE_KEY = "db_schema:v2";
const CACHE_TTL_SECONDS = 60 * 60;
const MAX_COLUMNS_PER_TABLE = 40;
/** A catalogue read that takes longer is a sick database; fail instead of holding a connection. */
const SCHEMA_TIMEOUT_MS = 10_000;

/**
 * Every user schema, not only `public`: the demo data lives in `demo`.
 * information_schema only lists tables the connected role can access.
 */
const SCHEMA_QUERY = `
  SELECT c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE t.table_type IN ('BASE TABLE', 'VIEW')
    AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
    AND c.table_schema NOT LIKE 'pg\\_%'
  ORDER BY c.table_schema, c.table_name, c.ordinal_position`;

export function groupColumns(rows: ColumnRow[]): SchemaTable[] {
  const tables = new Map<string, SchemaTable>();
  for (const row of rows) {
    const key = `${row.table_schema}.${row.table_name}`;
    let table = tables.get(key);
    if (!table) {
      table = { schema: row.table_schema, name: row.table_name, columns: [] };
      tables.set(key, table);
    }
    table.columns.push({ name: row.column_name, type: row.data_type, nullable: row.is_nullable === "YES" });
  }
  return [...tables.values()];
}

/** One line per table, schema-qualified, with every column the model may use. */
export function formatSchemaForAI(tables: SchemaTable[]): string {
  if (tables.length === 0) return "(no tables visible to the connected role)";
  return tables
    .map((table) => {
      const columns = table.columns.slice(0, MAX_COLUMNS_PER_TABLE).map((c) => `${c.name} ${c.type}`);
      if (table.columns.length > MAX_COLUMNS_PER_TABLE) columns.push("…");
      return `${table.schema}.${table.name}(${columns.join(", ")})`;
    })
    .join("\n");
}

async function readCache(): Promise<SchemaTable[] | null> {
  try {
    return await redis.get<SchemaTable[]>(CACHE_KEY);
  } catch (error) {
    console.error("[DB Schema] cache read failed, querying the database:", error);
    return null;
  }
}

async function loadSchema(): Promise<SchemaTable[]> {
  const rows = await withReadOnlyTransaction(async (client) => {
    await client.query(`SET LOCAL statement_timeout = ${SCHEMA_TIMEOUT_MS}`);
    return (await client.query(SCHEMA_QUERY)).rows as ColumnRow[];
  });
  const tables = groupColumns(rows);
  await redis.setex(CACHE_KEY, CACHE_TTL_SECONDS, tables).catch((error) => {
    console.error("[DB Schema] cache write failed:", error);
  });
  return tables;
}

// One catalogue read per instance at a time: requests that miss the cache together share it.
let loading: Promise<SchemaTable[]> | null = null;

/** The database's tables and columns, cached in Redis for an hour. */
export async function getSchemaTables(): Promise<SchemaTable[]> {
  const cached = await readCache();
  if (cached) return cached;
  loading ??= loadSchema().finally(() => {
    loading = null;
  });
  return loading;
}

/** The schema as prompt text for the AI helpers. */
export async function getCachedSchema(): Promise<string> {
  return formatSchemaForAI(await getSchemaTables());
}

