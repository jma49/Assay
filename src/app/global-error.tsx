"use client";

import "./globals.css";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Replaces the root layout when it fails, so no app providers (language,
// theme) are available here: the language comes from the browser.
const copy = {
  en: { title: "Something went wrong", description: "The error was reported. Try again, or reload the page.", retry: "Try again" },
  zh: { title: "出错了", description: "错误已上报。请重试，或刷新页面。", retry: "重试" },
};

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const t = typeof navigator !== "undefined" && navigator.language.startsWith("zh") ? copy.zh : copy.en;

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-title">{t.title}</h1>
          <p className="text-body-md text-muted-foreground">{t.description}</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-primary px-4 py-2 text-body-md text-primary-foreground"
          >
            {t.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
