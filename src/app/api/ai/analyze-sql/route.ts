import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJson, withAuth } from "@/server/http/route";
import { aiError, guardAiRequest } from "@/server/http/ai-guard";
import { Permission } from "@/lib/auth/rbac";
import { getCachedSchema } from "@/lib/database/db-schema";
import { generateContentWithRetry, logTokenUsage } from "@/lib/utils/ai-utils";

const Body = z.object({
  sql: z.string().min(1),
  analysisType: z.enum(["explain", "optimize"]),
  /** The reader's language; the answer is written in it. */
  language: z.enum(["en", "zh"]).catch("en"),
});

const ASK = {
  explain: ["Explain this SQL query", ["What it is for", "How it runs", "Performance considerations"]],
  optimize: ["Suggest how to optimize this SQL query", ["Performance bottlenecks", "Index suggestions", "An optimized query, if one helps"]],
} as const;

const REPLY_IN = { en: "English", zh: "Simplified Chinese" } as const;

/** The prompt for one analysis, with the table schema as context. */
function analysisPrompt(sql: string, type: keyof typeof ASK, schema: string, language: keyof typeof REPLY_IN): string {
  const [task, points] = ASK[type];
  return [
    `${task} (table schema: ${schema})`,
    "",
    "```sql",
    sql,
    "```",
    "",
    "Cover briefly:",
    ...points.map((point, index) => `${index + 1}. ${point}`),
    "",
    `Answer in Markdown, in ${REPLY_IN[language]}.`,
  ].join("\n");
}

export const POST = withAuth(Permission.SCRIPT_CREATE, async (request, { principal }) => {
  const { sql, analysisType, language } = await parseJson(request, Body);
  await guardAiRequest(principal.id, { sql });

  try {
    const prompt = analysisPrompt(sql, analysisType, await getCachedSchema(), language);
    const analysis = await generateContentWithRetry(prompt, { feature: "analyze-sql", userId: principal.id });
    logTokenUsage(prompt, analysis, `analyze-sql ${analysisType}`);
    return NextResponse.json({ analysis, analysisType, success: true });
  } catch (error) {
    console.error("[AI analyze SQL] The model call failed:", error);
    throw aiError(error);
  }
});
