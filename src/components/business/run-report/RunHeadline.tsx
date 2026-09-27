import { cn } from "@/lib/utils/utils";
import { cleanRunMessage } from "@/lib/utils/run-message";
import { TONE_TEXT_CLASS, type RunTone } from "./run-report";

/** What happened, in one line, above the rows that prove it. */
export function RunHeadline({
  tone,
  headline,
  subtitle,
  message,
}: {
  tone: RunTone;
  headline: string;
  subtitle: string;
  message: string;
}) {
  return (
    <header className="rounded-xl bg-card shadow-border flex items-start gap-3  px-5 py-4">
      <span className={cn("status-dot mt-2", `status-dot-${tone}`)} aria-hidden />
      <div className="min-w-0">
        <p className={cn("font-display text-[26px] leading-tight font-semibold", TONE_TEXT_CLASS[tone])}>{headline}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {subtitle}
        </p>
        {tone === "failure" && message && (
          <p className="mt-2 font-mono text-[13px] break-words">{cleanRunMessage(message)}</p>
        )}
      </div>
    </header>
  );
}
