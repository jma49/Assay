import { useState } from "react";
import { toast } from "sonner";
import { apiErrorText } from "@/client/api-errors";
import { sendJson } from "@/client/send-json";

type AnalysisType = "explain" | "optimize";
type DryRun = { ok: true; rowCount: number } | { ok: false; error: string };

/**
 * The editor's AI calls: drafting a query from a request (dry-run on the
 * server) and explaining or optimizing the current one. Results and failures
 * are reported with toasts; `onDraft` puts a drafted query in the editor.
 */
export function useSqlAssistant(sql: string, language: "en" | "zh", onDraft: (sql: string) => void) {
  const zh = language === "zh";
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ type: AnalysisType; text: string | null; open: boolean }>({
    type: "explain",
    text: null,
    open: false,
  });

  const generate = async (prompt: string) => {
    if (!prompt.trim()) {
      toast.warning(zh ? "请输入SQL生成描述" : "Describe the check you want first");
      return;
    }
    setIsGenerating(true);
    try {
      const data = await sendJson<{ success?: boolean; sql?: string; dryRun?: DryRun }>("/api/ai/generate-sql", "POST", { prompt });
      if (!data.success || !data.sql) throw new Error(zh ? "AI 返回的数据格式有误" : "The AI answer was malformed");
      onDraft(data.sql);
      const dryRun = data.dryRun;
      if (dryRun && !dryRun.ok) {
        toast.warning(zh ? "已生成查询，但试运行失败" : "Query drafted, but its dry run failed", { description: dryRun.error, duration: 6000 });
      } else {
        toast.success(zh ? "AI已成功生成SQL语句" : "Query generated", {
          description: dryRun
            ? zh
              ? `试运行通过：当前会标出 ${dryRun.rowCount} 行`
              : `Dry run passed: it flags ${dryRun.rowCount} rows today`
            : zh
              ? "SQL已插入到编辑器中"
              : "It is now in the editor.",
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("[editor] AI SQL generation failed:", error);
      toast.error(zh ? "AI生成SQL失败" : "Could not generate a query", { description: apiErrorText(error, language), duration: 5000 });
    } finally {
      setIsGenerating(false);
    }
  };

  const analyze = async (type: AnalysisType) => {
    if (!sql.trim()) {
      toast.warning(zh ? "请先输入SQL语句" : "Write a query first");
      return;
    }
    setIsAnalyzing(true);
    setAnalysis((current) => ({ ...current, type }));
    try {
      const data = await sendJson<{ success?: boolean; analysis?: string }>("/api/ai/analyze-sql", "POST", { sql, analysisType: type, language });
      if (!data.success || !data.analysis) throw new Error(zh ? "AI 返回的数据格式有误" : "The AI answer was malformed");
      setAnalysis({ type, text: data.analysis, open: true });
      const title = type === "explain" ? (zh ? "AI解释已生成" : "Explanation ready") : zh ? "AI优化建议已生成" : "Suggestions ready";
      toast.success(title, { description: zh ? "点击查看详细分析结果" : "Open it to read the analysis.", duration: 3000 });
    } catch (error) {
      console.error("[editor] AI SQL analysis failed:", error);
      toast.error(zh ? "AI分析SQL失败" : "Could not analyze the query", { description: apiErrorText(error, language), duration: 5000 });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const setAnalysisOpen = (open: boolean) => setAnalysis((current) => ({ ...current, open }));

  return { generate, analyze, isGenerating, isAnalyzing, analysis, setAnalysisOpen };
}
