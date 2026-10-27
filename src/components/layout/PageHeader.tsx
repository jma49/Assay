import type { ReactNode } from "react";
import { WindowToolbar } from "@/components/layout/WindowChrome";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** The page's main actions; they go to the right of the window toolbar. */
  actions?: ReactNode;
}

/**
 * The shell draws the visible title as decoration for sighted readers; this is the page's real
 * `<h1>` for assistive tech. The page's actions move up to the shell toolbar.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <>
      <header className="sr-only">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </header>
      {actions && (
        <WindowToolbar>
          <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
        </WindowToolbar>
      )}
    </>
  );
}
