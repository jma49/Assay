import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import { aiModel, gatewayOptions } from "@/lib/ai/model";
import { dryRunCheck, type DryRunResult } from "@/lib/sql/dry-run";

export const checkDraftSchema = z.object({
  name: z.string().describe("Short title of the check, in the language of the request"),
  scriptId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).describe("kebab-case id"),
  description: z.string().describe("One sentence: what a returned row means"),
  scope: z.string().describe("Business area the check belongs to"),
  tags: z.array(z.string()).max(5),
  sql: z.string().describe("A single PostgreSQL SELECT or WITH query, no trailing semicolon"),
  rationale: z.string().describe("Why these tables and conditions answer the request"),
});

export type CheckDraft = z.infer<typeof checkDraftSchema>;

export interface DraftCheckResult {
  draft: CheckDraft;
  dryRun: DryRunResult;
  /** Model calls made: 1, or 2 when the first draft failed its dry run. */
  attempts: number;
}

const MAX_ATTEMPTS = 2;

export function draftCheckPrompt(request: string, schema: string, previous?: { sql: string; error: string }) {
  const repair = previous
    ? `\n\nYour previous query failed when run:\n${previous.sql}\nError: ${previous.error}\nFix it.`
    : "";
  return `You write data-quality checks for Assay. A check is one read-only PostgreSQL query that returns the rows needing attention; no rows means the check passes.

Database schema:
${schema}

Request:
${request}

Use only tables and columns from the schema. Return the offending rows with enough columns to identify them.${repair}`;
}

/**
 * Turns a plain-language request into a check the user can review: the
 * model drafts it, the query is dry-run against the database read-only, and
 * a failing draft gets one repair attempt with the error fed back.
 */
export async function draftCheck(options: {
  request: string;
  schema: string;
  userId?: string;
  model?: LanguageModel;
  dryRun?: (sql: string) => Promise<DryRunResult>;
}): Promise<DraftCheckResult> {
  const dryRun = options.dryRun ?? ((sql: string) => dryRunCheck(sql));
  let previous: { sql: string; error: string } | undefined;

  for (let attempt = 1; ; attempt++) {
    const { output: draft } = await generateText({
      model: options.model ?? aiModel(),
      output: Output.object({ schema: checkDraftSchema }),
      prompt: draftCheckPrompt(options.request, options.schema, previous),
      providerOptions: gatewayOptions("draft-check", options.userId),
    });
    const result = await dryRun(draft.sql);
    if (result.ok || attempt >= MAX_ATTEMPTS) {
      return { draft, dryRun: result, attempts: attempt };
    }
    previous = { sql: draft.sql, error: result.error };
  }
}
