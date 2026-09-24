import type { ReactNode } from "react";

/** One quiet line (plus an optional hint and action) for lists with nothing to show. */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-16 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-[13px] text-muted-foreground">{hint}</p>}
      {action && <div className="pt-3">{action}</div>}
    </div>
  );
}
