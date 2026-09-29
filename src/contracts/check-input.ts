import { z } from "zod";

/** Optional text a check carries; null or missing is stored as nothing. */
const text = z.string().nullish();

/** What people may set on a check (EDITABLE_CHECK_FIELDS); everything else is the server's. */
const editable = {
  name: z.string().min(1, "name is required"),
  cnName: text,
  description: text,
  cnDescription: text,
  scope: text,
  cnScope: text,
  author: text,
  hashtags: z.array(z.string()).optional(),
  sqlContent: z.string().min(1, "sqlContent is required"),
  isScheduled: z.boolean().optional(),
  cronSchedule: text,
};

/** POST /api/scripts: a new check. Unknown fields (createdBy, demoSeed, …) are dropped. */
export const NewCheckInput = z.object({
  scriptId: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid scriptId format. Use lowercase letters, numbers, and hyphens."),
  ...editable,
});
export type NewCheckInput = z.infer<typeof NewCheckInput>;

/**
 * PUT /api/scripts/[scriptId]: the fields to change, and the `version` the
 * edit started from (checked separately, so a missing one answers 428).
 */
export const CheckEditInput = z.object({
  ...editable,
  name: editable.name.optional(),
  sqlContent: editable.sqlContent.optional(),
  version: z.unknown().optional(),
});
export type CheckEditInput = z.infer<typeof CheckEditInput>;
