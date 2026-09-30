import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { ConnectionTestDto } from "@/contracts/data-sources";
import { cn } from "@/lib/utils/utils";
import type { Copy } from "./copy";
import { testTone } from "./data-sources";

const PANEL = {
  success: "bg-success-soft text-success",
  attention: "bg-attention-soft text-attention",
  failure: "bg-failure-soft text-failure",
} as const;

/** A connection test shown in the dialog: connected (and whether the role could write), or why it failed. */
export function TestResult({ test, t }: { test: ConnectionTestDto; t: Copy }) {
  const tone = testTone(test);
  const Icon = tone === "failure" ? XCircle : tone === "attention" ? AlertTriangle : CheckCircle2;
  const how = (test.writeAccess ?? []).map((access) => t.access[access] ?? access).join(", ");
  return (
    <div role="status" className={cn("flex items-start gap-2 rounded-md px-3 py-2 text-body-sm", PANEL[tone])}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="grid min-w-0 gap-0.5">
        {test.ok ? (
          <>
            <p>{t.resultOk(test.serverVersion ?? "?", test.currentUser ?? "?")}</p>
            {tone === "attention" && <p>{t.resultWrite(how)}</p>}
          </>
        ) : (
          <>
            <p className="font-medium">{t.resultFailed}</p>
            <p className="break-words">{test.error}</p>
          </>
        )}
      </div>
    </div>
  );
}
