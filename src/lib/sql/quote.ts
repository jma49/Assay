/**
 * Quoting for SQL that Assay writes itself (check templates). Every name is
 * quoted, so reserved words, mixed case and odd characters stay names and
 * never become syntax. Callers still only pass names the database reported.
 */

/** A PostgreSQL identifier: double-quoted, embedded quotes doubled. */
export function quoteIdent(name: string): string {
  if (name.length === 0 || name.includes("\0")) throw new Error("Invalid identifier");
  return `"${name.replace(/"/g, '""')}"`;
}

/** `"schema"."table"`. */
export const quoteTable = (schema: string, table: string) => `${quoteIdent(schema)}.${quoteIdent(table)}`;

/**
 * A standard string literal: single quotes doubled. PostgreSQL treats
 * backslashes in '...' as ordinary characters (standard_conforming_strings,
 * on by default since 9.1), so nothing else needs escaping.
 */
export function quoteLiteral(value: string): string {
  if (value.includes("\0")) throw new Error("Invalid string literal");
  return `'${value.replace(/'/g, "''")}'`;
}

/** A finite number as a numeric literal, or null. */
export function numericLiteral(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  // JSON-style exponents ("1e+21") are valid PostgreSQL numeric constants.
  return String(value);
}

/** Text safe inside a `--` comment: one line, no control characters. */
export const commentText = (text: string) => text.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
