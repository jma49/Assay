/**
 * The databases checks run against. `DATABASE_URL` is the built-in source
 * with the id `default`; admins can add more. A check without a
 * `dataSourceId` belongs to the built-in one.
 */
export const DEFAULT_SOURCE_ID = "default";

export const SOURCE_ENGINES = ["postgres"] as const;
export type SourceEngine = (typeof SOURCE_ENGINES)[number];

export const SOURCE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SOURCE_ID_MAX = 40;

/**
 * Ids no added source may take: the built-in one, and `test`, which
 * `/api/data-sources/test` (a static route) would shadow.
 */
const RESERVED_SOURCE_IDS = new Set([DEFAULT_SOURCE_ID, "test"]);

export const isReservedSourceId = (id: string) => RESERVED_SOURCE_IDS.has(id);

/** The source a check runs against. */
export function sourceIdOf(check: object | null | undefined): string {
  const id = (check as { dataSourceId?: unknown } | null | undefined)?.dataSourceId;
  return typeof id === "string" && id ? id : DEFAULT_SOURCE_ID;
}

/** A source id suggested from its name: lowercase words joined by hyphens. */
export function toSourceId(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SOURCE_ID_MAX)
    .replace(/-+$/, "");
}
