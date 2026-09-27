import type { Triage } from "@/lib/ai/triage";

/** Markdown for the result dialog; plain data in, so it is safe on the client. */
export function triageToMarkdown(triage: Triage, language: "en" | "zh"): string {
  const zh = language === "zh";
  const kind = {
    data_issue: zh ? "数据问题" : "Data issue",
    check_error: zh ? "检查本身有误" : "Problem in the check",
    needs_review: zh ? "需要人工判断" : "Needs review",
  }[triage.kind];
  const list = (items: string[]) => items.map((item) => `- ${item}`).join("\n");
  return [
    `**${kind}** — ${triage.summary}`,
    triage.causes.length ? `### ${zh ? "可能原因" : "Likely causes"}\n${list(triage.causes)}` : "",
    triage.nextSteps.length ? `### ${zh ? "下一步" : "Next steps"}\n${list(triage.nextSteps)}` : "",
    triage.fixedSql ? `### ${zh ? "修正后的查询" : "Corrected query"}\n\`\`\`sql\n${triage.fixedSql}\n\`\`\`` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
