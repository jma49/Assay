/**
 * What the run section prints: the SQL is the demo check's (scripts/demo/checks.ts:49-53); run A is the live demo's
 * run of 2026-10-19T23:30:05Z; run B is composed (23 restocked, 52 new) and labelled Example on the page.
 */

/** Product names follow the seed: noun = 1 + g % 6 (schema.sql:69). */
const NOUNS = ["Desk", "Chair", "Lamp", "Monitor", "Keyboard", "Mouse"] as const;

/** on_hand and reserved of a returned row. */
type Values = readonly [string, string];
export type Returned = Readonly<Record<number, Values>>;
export type Change = "new" | "still" | "fixed";

export const ROWS = 60;
export const RUN_A: Returned = { 7: ["-3", "4"], 23: ["-3", "2"], 41: ["-3", "0"] };
export const RUN_B: Returned = { 7: ["-3", "4"], 41: ["-3", "0"], 52: ["-1", "1"] };

/** The lead tags on film B, in the order they drop. */
export const TAGS: readonly (readonly [number, Change])[] = [
  [7, "still"],
  [23, "fixed"],
  [41, "still"],
  [52, "new"],
];

export const sku = (n: number) => `SKU-${String(n).padStart(4, "0")}`;
export const product = (n: number) => `${NOUNS[n % 6]} ${n}`;
export const valuesOf = (n: number): Values => RUN_B[n] ?? RUN_A[n] ?? ["", ""];

/** The check's SQL, one entry per line: [keyword, rest] pairs. Line 4 (WHERE) is the one in focus. */
export const SQL: readonly (readonly string[])[] = [
  ["SELECT", " p.sku, p.name, i.on_hand, i.reserved"],
  ["FROM", " demo.inventory i"],
  ["JOIN", " demo.products p ", "ON", " p.id = i.product_id"],
  ["WHERE", " i.on_hand < 0"],
  ["ORDER BY", " i.on_hand;"],
];
export const SQL_FOCUS = 3;

export const COLUMNS = ["sku", "name", "on_hand", "reserved"] as const;

/** The diff of run B against run A, in the order the readings print it. */
export const DIFF: readonly (readonly [Change, readonly number[]])[] = [
  ["new", [52]],
  ["still", [7, 41]],
  ["fixed", [23]],
];

/** Printed proof that is the same in every language. */
export const PROOF = { readOnly: "BEGIN READ ONLY", timeout: "statement_timeout", from: "assay", time: "00:00" } as const;
