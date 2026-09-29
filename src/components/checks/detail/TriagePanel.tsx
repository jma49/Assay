import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import * as checksApi from "@/client/checks";
import { HighlightedLine } from "@/components/code/HighlightedLine";
import { Button } from "@/components/ui/button";
import type { CheckDetail } from "@/contracts/checks";
import type { Triage } from "@/lib/ai/triage";
import { useMe } from "@/lib/auth/use-me";
import type { Copy } from "./copy";

export function TriagePanel({ check, t, language }: { check: CheckDetail; t: Copy; language: "en" | "zh" }) {
  const me = useMe();
  const [triage, setTriage] = useState<Triage | null>(null);
  const [busy, setBusy] = useState(false);
  const latest = check.latest;

  if (!me?.ai) return <p className="px-6 py-10 text-center text-body-sm text-muted-foreground">{t.triageOff}</p>;
  if (!latest || latest.outcome === "clean") {
    return <p className="px-6 py-10 text-center text-body-sm text-muted-foreground">{t.triageClean}</p>;
  }

  const start = async () => {
    setBusy(true);
    try {
      const body = await checksApi.triage(latest.runId, language);
      setTriage(body.triage ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 p-5">
      {!triage ? (
        <div className="flex flex-col items-start gap-3">
          <p className="max-w-[60ch] text-body-sm text-muted-foreground">{t.triageIntro}</p>
          <Button onClick={start} disabled={busy}>
            <Sparkles />
            {busy ? t.triaging : t.triageRun}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 text-body-md">
          <p>
            <span className="mr-2 rounded-md bg-primary-soft px-1.5 py-0.5 text-caption font-medium text-primary">{t.kind[triage.kind]}</span>
            {triage.summary}
          </p>
          {triage.causes.length > 0 && (
            <div>
              <p className="mb-1 text-label-caps uppercase text-muted-foreground">{t.causes}</p>
              <ul className="list-disc space-y-1 pl-5">{triage.causes.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          )}
          {triage.nextSteps.length > 0 && (
            <div>
              <p className="mb-1 text-label-caps uppercase text-muted-foreground">{t.nextSteps}</p>
              <ul className="list-disc space-y-1 pl-5">{triage.nextSteps.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          )}
          {triage.fixedSql && (
            <div>
              <p className="mb-1 text-label-caps uppercase text-muted-foreground">{t.fixedSql}</p>
              <pre className="overflow-x-auto rounded-lg bg-code p-4 font-mono text-body-sm leading-6">
                {triage.fixedSql.split("\n").map((line, i) => (
                  <div key={i} className="whitespace-pre">
                    {line ? <HighlightedLine text={line} language="sql" /> : " "}
                  </div>
                ))}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
