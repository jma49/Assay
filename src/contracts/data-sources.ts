import { z } from "zod";
import { SOURCE_ENGINES, SOURCE_ID_MAX, SOURCE_ID_PATTERN, type SourceEngine } from "@/domain/data-source";

/** The result of connecting to a source and reading from it once. */
export interface ConnectionTestDto {
  ok: boolean;
  at: string;
  /** Why the connection or the read failed. */
  error?: string;
  serverVersion?: string;
  currentUser?: string;
  /** False when the role can write somewhere: a warning, since checks only need SELECT. */
  readOnly?: boolean;
  /** How it could write: superuser, pg_write_all_data, table_write, create_schema. */
  writeAccess?: string[];
}

/** A source as pages see it: never its connection string. */
export interface DataSourceDto {
  sourceId: string;
  name: string;
  engine: SourceEngine;
  /** `user@host:port/database`; null for demo guests. */
  display: string | null;
  /** The built-in source from DATABASE_URL: shown, never edited or deleted here. */
  builtIn: boolean;
  version: number;
  lastTest: ConnectionTestDto | null;
  /** Checks that run against it. */
  checkCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface DataSourcesResponse {
  sources: DataSourceDto[];
  setup: {
    canManage: boolean;
    /** Without ASSAY_SECRET_KEY no source can be saved. */
    secretKey: boolean;
    /** ALLOW_PRIVATE_DATA_SOURCES: whether hosts on private networks are accepted. */
    allowPrivate: boolean;
  };
}

export const DataSourceId = z
  .string()
  .max(SOURCE_ID_MAX)
  .regex(SOURCE_ID_PATTERN, "Use lowercase letters, numbers and hyphens");

const Name = z.string().trim().min(1).max(80);
const ConnectionString = z.string().trim().min(1, "connectionString is required").max(2000);

/** POST /api/data-sources */
export const CreateDataSource = z.object({
  sourceId: DataSourceId,
  name: Name,
  engine: z.enum(SOURCE_ENGINES).default("postgres"),
  connectionString: ConnectionString,
});
export type CreateDataSource = z.infer<typeof CreateDataSource>;

/** PATCH /api/data-sources/[sourceId]: an empty or missing connection string keeps the stored one. */
export const UpdateDataSource = z.object({
  name: Name.optional(),
  connectionString: z.string().trim().max(2000).optional(),
  version: z.number().int().min(1),
});
export type UpdateDataSource = z.infer<typeof UpdateDataSource>;

/** POST /api/data-sources/test: a connection string that is not saved yet. */
export const TestConnection = z.object({ connectionString: ConnectionString });
