"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useLanguage } from "@/components/common/LanguageProvider";
import { useDashboardT } from "@/components/business/dashboard/useDashboardT";
import { ScriptMetadataForm } from "@/components/business/scripts/ScriptMetadataForm";
import { NoCreateAccess } from "@/components/checks/new/NoCreateAccess";
import { useNewCheck } from "@/components/checks/new/useNewCheck";
import { TemplatePicker } from "@/components/checks/templates/TemplatePicker";
import { APP_CONTAINER } from "@/components/layout/app-container";
import { WindowToolbar } from "@/components/layout/WindowChrome";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";

// CodeMirror and its themes are large; load them only where the editor renders.
const CodeMirrorEditor = dynamic(() => import("@/components/business/scripts/CodeMirrorEditor"), {
  ssr: false,
  loading: () => <div className="skeleton-shimmer h-[480px] rounded-lg" />,
});

const COPY = {
  en: {
    back: "Checks",
    title: "New check",
    lead: "A check passes when its query returns no rows. Any rows it returns need attention.",
    cancel: "Cancel",
    save: "Save check",
    saving: "Saving…",
  },
  zh: {
    back: "检查",
    title: "新建检查",
    lead: "查询没有返回任何行即为通过，返回的每一行都需要处理。",
    cancel: "取消",
    save: "保存检查",
    saving: "保存中…",
  },
};

export default function NewCheckPage() {
  const { language } = useLanguage();
  const c = COPY[language];
  const t = useDashboardT<string>();
  const form = useNewCheck(language);

  if (form.canCreate === false) return <NoCreateAccess />;

  return (
    <div className={`${APP_CONTAINER} space-y-5 py-6`}>
      <WindowToolbar>
        <Button asChild variant="outline" size="sm">
          <Link href="/checks">‹ {c.back}</Link>
        </Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={form.cancel} disabled={form.isSaving}>
            {c.cancel}
          </Button>
          <Button size="sm" onClick={form.save} disabled={form.isSaving}>
            {form.isSaving ? c.saving : c.save}
          </Button>
        </div>
      </WindowToolbar>

      <header>
        <h1 className="sr-only">{c.title}</h1>
        <p className="text-[13px] text-muted-foreground">{c.lead}</p>
      </header>

      <TemplatePicker initialTable={form.tableParam} onApply={form.applyTemplate} />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <div
            id="new-check-sql"
            className={cn("rounded-lg", form.errors.sql && "ring-1 ring-failure")}
            aria-invalid={form.errors.sql ? true : undefined}
            aria-describedby={form.errors.sql ? "new-check-sql-error" : undefined}
          >
            <CodeMirrorEditor value={form.sqlContent} onChange={form.changeSql} minHeight="480px" fill t={t} />
          </div>
          {form.errors.sql && (
            <p id="new-check-sql-error" className="mt-1.5 text-[12px] text-failure">
              {form.errors.sql}
            </p>
          )}
        </div>
        <aside className="self-start rounded-xl bg-card p-5 shadow-border lg:col-span-4">
          <ScriptMetadataForm formData={form.formData} onFormChange={form.changeField} errors={form.errors} t={t} />
        </aside>
      </div>
    </div>
  );
}
