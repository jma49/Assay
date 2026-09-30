import * as React from "react";

import { cn } from "@/lib/utils/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border border-input bg-card shadow-xs rounded-md sm:text-body-sm placeholder:text-muted-foreground focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full px-3 py-2 transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-body-md",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
