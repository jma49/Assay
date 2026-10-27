import { cn } from "@/lib/utils/utils";
import type { RunOutcome } from "@/domain/run";

/**
 * An outcome drawn as the state of a strip of film: a lit row for Issues, clear film for Clean,
 * fog for Broken. The word is always printed beside it; this is the second, pre-attentive cue.
 */
export function OutcomeGlyph({
  outcome,
  large = false,
  className,
}: {
  outcome: RunOutcome | null;
  large?: boolean;
  className?: string;
}) {
  const state = outcome ?? "none";
  return (
    <span
      aria-hidden
      className={cn("outcome-glyph", `outcome-glyph-${state}`, large && "outcome-glyph-lg", className)}
    />
  );
}
