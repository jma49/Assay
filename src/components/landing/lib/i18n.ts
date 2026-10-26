/**
 * Copy tables for the landing. Each section keeps its strings in a typed table next to it (copy.ts):
 *
 *   export const copy = defineCopy({ en: { title: "…" }, zh: { title: "…" } });   // zh must match en's shape
 *   const t = useCopy(copy);                                                       // in the component
 *
 * Strings that carry inline markup (<code>, <b>, a hand break <br>) are written as JSX in the table, so they stay
 * typed and React renders them: `a1: <>PostgreSQL… <code>DATABASE_URL</code> …</>`. Break Chinese headlines by hand.
 */
import type { ReactNode } from "react";
import { useLanding } from "./context";
import type { Language } from "./runtime";

/** A widened shape: literal strings become string, so the zh table only has to match en's keys and kinds. */
type Shape<T> = T extends string ? string : T extends readonly (infer U)[] ? Shape<U>[] : T extends ReactNode ? ReactNode : { [K in keyof T]: Shape<T[K]> };

export type CopyTable<T> = Record<Language, Shape<T>>;

export function defineCopy<T>(table: { en: T; zh: Shape<T> }): CopyTable<T> {
  return table as CopyTable<T>;
}

/** The copy of the landing's current language. */
export function useCopy<T>(table: CopyTable<T>): Shape<T> {
  return table[useLanding().language];
}
