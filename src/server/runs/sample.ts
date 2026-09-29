import type { Document } from "mongodb";
import { sampleRows } from "@/domain/run";

/**
 * A stored run's sample rows. Runs saved before 2026-09-28 keep them under
 * the retired name `raw_results`; the fallback can go once those have
 * expired (RUN_RETENTION_DAYS; the last one expires 2026-12-26).
 */
export function storedSample(run: Document | null | undefined): Record<string, unknown>[] {
  const rows = run?.sample ?? run?.raw_results;
  return Array.isArray(rows) ? rows : [];
}

/**
 * The sample as a response may carry it: within SAMPLE_BYTES of UTF-8 JSON.
 * Runs saved before 2026-09-28 were capped at 2 MB counted in UTF-16 units,
 * which could be several MB of bytes; this trims them on the way out.
 */
export function responseSample(run: Document | null | undefined): Record<string, unknown>[] {
  return sampleRows(storedSample(run));
}

/** Projection for `storedSample`: both names, until the old one has expired. */
export const SAMPLE_FIELDS = { sample: 1, raw_results: 1 } as const;

/** Projection for the first `rows` sample rows only, so a caller that shows a few never reads them all. */
export const sampleSlice = (rows: number) => ({ sample: { $slice: rows }, raw_results: { $slice: rows } }) as const;
