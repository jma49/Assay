"use client";

import { cn } from "@/lib/utils/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  return (
    <div 
      className={cn(
        "animate-spin rounded-full border border-border border-t-border  ",
        sizeClasses[size],
        className
      )}
    />
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  /** Unused since the overlay dropped its spinner; kept for existing callers. */
  spinnerSize?: "sm" | "md" | "lg";
  text?: string;
}

export function LoadingOverlay({ 
  isLoading, 
  children, 
  className,
  text
}: LoadingOverlayProps) {
  // Refreshing existing content: dim it and run a thin line along the top
  // instead of hiding it behind a spinner.
  return (
    <div className={cn("relative", className)} aria-busy={isLoading} aria-label={isLoading ? text : undefined}>
      <div className={cn("transition-opacity duration-200", isLoading && "pointer-events-none opacity-50")}>
        {children}
      </div>
      {isLoading && (
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
          <div
            className="h-full origin-left bg-foreground/60"
            style={{ animation: "nav-progress 4s cubic-bezier(0.1, 0.7, 0.2, 1) forwards" }}
          />
        </div>
      )}
    </div>
  );
}

interface PageLoadingProps {
  text?: string;
}

export function PageLoading({ text = "加载中..." }: PageLoadingProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground font-medium">
          {text}
        </p>
      </div>
    </div>
  );
}

interface ContentLoadingProps {
  rows?: number;
  className?: string;
}

export function ContentLoading({ rows = 3, className }: ContentLoadingProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-accent rounded animate-pulse" 
               style={{ width: `${Math.random() * 40 + 60}%` }} />
          <div className="h-4 bg-accent rounded animate-pulse" 
               style={{ width: `${Math.random() * 60 + 40}%` }} />
        </div>
      ))}
    </div>
  );
} 