import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { triageToMarkdown } from "@/lib/ai/triage-format";
import type { ExecutionResult, Language } from "./run-report";

/** Toolbar actions on a run: AI triage and running the check again. */
export function useRunActions(result: ExecutionResult | null, language: Language) {
  const router = useRouter();
  const [isTriaging, setIsTriaging] = useState(false);
  const [triage, setTriage] = useState<string | null>(null);
  const [isTriageOpen, setIsTriageOpen] = useState(false);
  const [isRunningAgain, setIsRunningAgain] = useState(false);

  // Back where the visitor came from (a check, the runs list), or to the checks.
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/checks");
  };

  // Triage runs on the server from the run id; the answer is cached on the run.
  const requestTriage = async () => {
    if (!result) return;
    setIsTriaging(true);
    try {
      const response = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId: result._id, language }),
      });
      const data = await response.json();
      if (!response.ok || !data.triage) {
        throw new Error(data.error || response.statusText);
      }
      setTriage(triageToMarkdown(data.triage, language));
      setIsTriageOpen(true);
    } catch (error) {
      toast.error(language === "zh" ? "AI 分诊失败" : "AI triage failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsTriaging(false);
    }
  };

  const runAgain = async () => {
    if (!result) return;
    setIsRunningAgain(true);
    try {
      const response = await fetch("/api/run-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId: result.scriptId }),
      });
      const data = await response.json();
      if (!response.ok || !data.mongoResultId) {
        throw new Error(data.message || response.statusText);
      }
      router.push(`/view-execution-result/${data.mongoResultId}`);
    } catch (error) {
      toast.error(language === "zh" ? "执行失败" : "Could not run the check", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsRunningAgain(false);
    }
  };

  return { goBack, isTriaging, triage, isTriageOpen, setIsTriageOpen, requestTriage, isRunningAgain, runAgain };
}
