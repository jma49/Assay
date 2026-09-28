import type { RunOutcome } from "@/domain/run";
import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import { aiModel, gatewayOptions } from "@/lib/ai/model";
import type { ColumnProfile } from "@/lib/ai/row-profile";

export const triageSchema = z.object({
  kind: z
    .enum(["data_issue", "check_error", "needs_review"])
    .describe("data_issue: the rows are real problems; check_error: the query itself failed or is wrong; needs_review: cannot tell"),
  summary: z.string().describe("Two sentences at most"),
  causes: z.array(z.string()).max(4).describe("Most likely causes, most likely first"),
  nextSteps: z.array(z.string()).max(4).describe("Concrete actions for whoever is on call"),
  fixedSql: z.string().nullable().describe("A corrected query when kind is check_error, otherwise null"),
});

export type Triage = z.infer<typeof triageSchema>;

export interface TriageInput {
  check: { scriptId: string; name?: string; description?: string; sql?: string };
  run: { outcome: RunOutcome; message?: string; rowCount: number; profile: { sampled: number; columns: ColumnProfile[] } };
  schema: string;
  language: "en" | "zh";
}

export function triagePrompt({ check, run, schema, language }: TriageInput): string {
  const columns = run.profile.columns
    .map((c) => `- ${c.column}: ${c.types.join("/") || "all null"}, ${c.nulls} null, ${c.distinct} distinct`)
    .join("\n");
  return `You triage failed or flagged runs of Assay data-quality checks. A check is a read-only query; every row it returns needs attention. Outcome "issues" means it returned rows; "error" means the query itself errored.

Check: ${check.name ?? check.scriptId} (${check.scriptId})
What a returned row means: ${check.description || "(not described)"}
Query:
${check.sql || "(query unavailable)"}

Run outcome: ${run.outcome}
Message: ${run.message || "(none)"}
Rows returned: ${run.rowCount}
Column profile of the first ${run.profile.sampled} rows (values are withheld on purpose):
${columns || "(no rows)"}

Database schema:
${schema}

Write the answer in ${language === "zh" ? "Simplified Chinese" : "English"}. Do not invent row values.`;
}

/** Structured triage of one run; the caller decides when it is worth a model call. */
export async function triageRun(input: TriageInput, options: { userId?: string; model?: LanguageModel } = {}): Promise<Triage> {
  const { output } = await generateText({
    model: options.model ?? aiModel(),
    output: Output.object({ schema: triageSchema }),
    prompt: triagePrompt(input),
    providerOptions: gatewayOptions("triage", options.userId),
  });
  return output;
}
