import type { ConnectionTestDto, DataSourceDto } from "@/contracts/data-sources";
import { DEFAULT_SOURCE_ID, toSourceId } from "@/domain/data-source";

export type Language = "en" | "zh";

/** The built-in source's name in the reader's language. */
const BUILT_IN_NAME = { en: "Primary", zh: "主库" } as const;

/** What a source is called on screen: the built-in one is named by the reader's language. */
export function sourceName(source: Pick<DataSourceDto, "sourceId" | "name"> & { builtIn?: boolean }, language: Language): string {
  return source.builtIn || source.sourceId === DEFAULT_SOURCE_ID ? BUILT_IN_NAME[language] : source.name;
}

export type TestTone = "success" | "attention" | "failure";

/** How a connection test reads: failed, connected with a role that could write, or connected read-only. */
export function testTone(test: Pick<ConnectionTestDto, "ok" | "readOnly">): TestTone {
  if (!test.ok) return "failure";
  return test.readOnly === false ? "attention" : "success";
}

export interface SourceForm {
  name: string;
  sourceId: string;
  connectionString: string;
  /** Once someone types an id, the name stops suggesting one. */
  idEdited: boolean;
}

export const emptyForm = (): SourceForm => ({ name: "", sourceId: "", connectionString: "", idEdited: false });

export const formOf = (source: DataSourceDto): SourceForm => ({ name: source.name, sourceId: source.sourceId, connectionString: "", idEdited: true });

/** Applies one edit; while adding, the id follows the name until the user types one. */
export function changeForm(form: SourceForm, field: "name" | "sourceId" | "connectionString", value: string): SourceForm {
  const next = { ...form, [field]: value };
  if (field === "name" && !form.idEdited) next.sourceId = toSourceId(value);
  if (field === "sourceId") next.idEdited = true;
  return next;
}

/** The body of a save: everything to add one; on edit the name, the connection only when typed, and the version. */
export function saveBody(form: SourceForm, editing: DataSourceDto | null) {
  if (!editing) return { name: form.name.trim(), sourceId: form.sourceId.trim(), connectionString: form.connectionString.trim() };
  const connectionString = form.connectionString.trim();
  return { name: form.name.trim(), version: editing.version, ...(connectionString && { connectionString }) };
}

/** Whether the dialog can save: a name and id, and a connection string unless an edit keeps the stored one. */
export function canSave(form: SourceForm, editing: DataSourceDto | null): boolean {
  if (!form.name.trim()) return false;
  if (editing) return true;
  return Boolean(form.sourceId.trim() && form.connectionString.trim());
}

/** Where a test goes: the typed connection string, or the saved source when an edit keeps its connection. */
export function testRequest(form: SourceForm, editing: DataSourceDto | null): { url: string; body?: { connectionString: string } } | null {
  const connectionString = form.connectionString.trim();
  if (connectionString) return { url: "/api/data-sources/test", body: { connectionString } };
  if (editing) return { url: `/api/data-sources/${encodeURIComponent(editing.sourceId)}/test` };
  return null;
}
