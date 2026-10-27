import React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/common/LanguageProvider";
import { OutcomeGlyph } from "@/components/checks/OutcomeGlyph";

const COPY = {
  en: {
    title: "Could not load the runs",
    description: "The server did not answer. The rest of Assay still works; try again.",
    info: "Error information",
    retry: "Retry",
  },
  zh: {
    title: "无法加载执行记录",
    description: "服务器没有响应。Assay 的其他部分不受影响，可以重试。",
    info: "错误信息",
    retry: "重试",
  },
};

interface LoadingErrorProps {
  error: string | null;
}

/** A contained failure of the runs list: the page frame stays, the next step is a retry. */
export const LoadingError: React.FC<LoadingErrorProps> = ({ error }) => {
  const t = COPY[useLanguage().language];
  return (
    <section className="face-note max-w-2xl p-5" role="alert">
      <div className="flex items-start gap-3">
        <OutcomeGlyph outcome="error" large className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-body-md font-medium text-ink">{t.title}</p>
          <p className="mt-1 text-body-sm text-ink-2">{t.description}</p>
        </div>
      </div>
      <p className="lead mt-4 text-ink-3">{t.info}</p>
      <div className="fog-message mt-1.5">
        <pre>{error}</pre>
      </div>
      <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
        <RefreshCw />
        {t.retry}
      </Button>
    </section>
  );
};
