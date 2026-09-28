import type { Document } from "mongodb";

/**
 * A stored run's sample rows. Runs saved before 2026-09-28 keep them under
 * the retired name `raw_results`; the fallback can go once those have
 * expired (RUN_RETENTION_DAYS; the last one expires 2026-12-26).
 */
export function storedSample(run: Document | null | undefined): Record<string, unknown>[] {
  const rows = run?.sample ?? run?.raw_results;
  return Array.isArray(rows) ? rows : [];
}

/** Projection for `storedSample`: both names, until the old one has expired. */
export const SAMPLE_FIELDS = { sample: 1, raw_results: 1 } as const;
