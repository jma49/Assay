"use client";

import React, { useEffect, useState } from "react";
import { WindowToolbar } from "@/components/layout/WindowChrome";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/client";
import { toast } from "sonner";
import { sendJson } from "@/client/send-json";
import { Button } from "@/components/ui/button";
import { APP_CONTAINER } from "@/components/layout/app-container";
import {
  ScriptMetadataForm,
  ScriptFormData,
} from "@/components/business/scripts/ScriptMetadataForm";
import dynamic from "next/dynamic";

// CodeMirror and its themes are large; load them only where the editor renders.
const CodeMirrorEditor = dynamic(
  () => import("@/components/business/scripts/CodeMirrorEditor"),
  { ssr: false, loading: () => <div className="h-[480px] animate-pulse rounded-lg border bg-muted/40" /> },
);
import { useLanguage } from "@/components/common/LanguageProvider";
import { useDashboardT } from "@/components/business/dashboard/useDashboardT";
import { sqlValidationMessage, validateReadOnlySql } from "@/lib/sql/read-only-validator";
import { scheduleProblem } from "@/lib/scheduling/schedule";
import { TemplatePicker } from "@/components/checks/templates/TemplatePicker";
import type { TableRef, TemplateCheck } from "@/lib/checks/templates";

const SCRIPT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const INITIAL_SQL = `-- A check passes when this query returns no rows.
-- Return the rows that need attention, for example:
SELECT id, created_at
FROM your_table
WHERE status IS NULL;
`;

const TABLE_NAME = /^[A-Za-z_][\w$]*(\.[A-Za-z_][\w$]*)?$/;

/** A starting query for a check on one table, opened from the coverage view. */
function starterSqlFor(table: string) {
  return `-- A check passes when this query returns no rows.
-- Replace "false" with what makes a row need attention.
SELECT *
FROM ${table}
WHERE false;
`;
}

const initialFormData: ScriptFormData = {
  scriptId: "",
  name: "",
  cnName: "",
  description: "",
  cnDescription: "",
  author: "",
  scope: "",
  cnScope: "",
  hashtags: [],
  isScheduled: false,
  cronSchedule: "",
};

const copy = {
  en: {
    breadcrumb: "Scripts",
    title: "New check",
    lead: "A check passes when its query returns no rows. Any rows it returns need attention.",
    cancel: "Cancel",
    save: "Save check",
    saving: "Saving…",
    missing: "Add a name, a script ID and a query before saving.",
    badId: "Script ID can only use lowercase letters, numbers and hyphens.",
    saved: "Check saved",
    submitted: "Submitted for approval",
    submittedDesc: "An admin or manager needs to approve it before it runs.",
    failed: "Could not save the check",
    templateApplied: "Template applied",
    undo: "Undo",
  },
  zh: {
    breadcrumb: "脚本",
    title: "新建检查",
    lead: "查询没有返回任何行即为通过，返回的每一行都需要关注。",
    cancel: "取消",
    save: "保存检查",
    saving: "保存中…",
    missing: "保存前请填写名称、脚本 ID 和查询。",
    badId: "脚本 ID 只能使用小写字母、数字和连字符。",
    saved: "检查已保存",
    submitted: "已提交审批",
    submittedDesc: "需要管理员或经理审批后才会生效。",
    failed: "保存失败",
    templateApplied: "已套用模板",
    undo: "撤销",
  },
};

const toScriptId = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function NewScriptPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { language } = useLanguage();
  const c = copy[language];

  const [formData, setFormData] = useState<ScriptFormData>(initialFormData);
  const [sqlContent, setSqlContent] = useState(INITIAL_SQL);
  const [scriptIdEdited, setScriptIdEdited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tableParam, setTableParam] = useState<string | null>(null);

  const t = useDashboardT<string>();

  // Coverage links here with ?table=schema.table; only plain identifiers are accepted.
  useEffect(() => {
    const table = new URLSearchParams(window.location.search).get("table");
    if (!table || !TABLE_NAME.test(table)) return;
    setTableParam(table);
    setSqlContent(starterSqlFor(table));
    const schema = table.includes(".") ? table.split(".")[0] : "";
    if (schema) setFormData((prev) => (prev.scope ? prev : { ...prev, scope: schema }));
  }, []);

  // Prefill the author once the signed-in user is known; the API falls back to it anyway.
  useEffect(() => {
    const defaultAuthor = user?.name;
    if (defaultAuthor) {
      setFormData((prev) => (prev.author ? prev : { ...prev, author: defaultAuthor }));
    }
  }, [user]);

  const handleFormChange = (
    field: keyof ScriptFormData,
    value: string | boolean | string[],
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && typeof value === "string" && !scriptIdEdited) {
        next.scriptId = toScriptId(value);
      }
      return next;
    });
    if (field === "scriptId") setScriptIdEdited(true);
  };

  // A template replaces the query and the names; the toast can put them back.
  const applyTemplate = (check: TemplateCheck, table: TableRef) => {
    const before = { sqlContent, formData, scriptIdEdited };
    setSqlContent(check.sql);
    setFormData((prev) => ({
      ...prev,
      scriptId: check.scriptId,
      name: check.name,
      cnName: check.cnName,
      description: check.description,
      cnDescription: check.cnDescription,
      scope: prev.scope || table.schema,
    }));
    setScriptIdEdited(false);
    toast.success(c.templateApplied, {
      action: {
        label: c.undo,
        onClick: () => {
          setSqlContent(before.sqlContent);
          setFormData(before.formData);
          setScriptIdEdited(before.scriptIdEdited);
        },
      },
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.scriptId.trim() || !sqlContent.trim()) {
      toast.error(c.missing);
      return;
    }
    if (!SCRIPT_ID_PATTERN.test(formData.scriptId)) {
      toast.error(c.badId);
      return;
    }
    const badSchedule = scheduleProblem(formData.isScheduled, formData.cronSchedule, language);
    if (badSchedule) {
      toast.error(badSchedule);
      return;
    }
    const validation = validateReadOnlySql(sqlContent);
    if (!validation.isValid) {
      toast.error(sqlValidationMessage(validation, language));
      return;
    }

    setIsSaving(true);
    try {
      const result = await sendJson<{ requiresApproval?: boolean }>("/api/scripts", "POST", { ...formData, sqlContent });
      if (result.requiresApproval) {
        toast.success(c.submitted, { description: c.submittedDesc });
      } else {
        toast.success(c.saved);
      }
      router.push("/checks/manage");
    } catch (error) {
      toast.error(c.failed, {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <main className={`${APP_CONTAINER} space-y-8 py-8`}>
        <header className="sr-only">
          <h1>{c.title}</h1>
          <p>{c.lead}</p>
        </header>
        <WindowToolbar>
          <Button asChild variant="outline" size="sm">
            <Link href="/checks/manage">‹ {c.breadcrumb}</Link>
          </Button>
          <p className="text-[13px] text-foreground/70 max-md:hidden">{c.lead}</p>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/checks/manage")} disabled={isSaving}>
              {c.cancel}
            </Button>
            <Button size="sm" className="" onClick={handleSave} disabled={isSaving}>
              {isSaving ? c.saving : c.save}
            </Button>
          </div>
        </WindowToolbar>

        <TemplatePicker initialTable={tableParam} onApply={applyTemplate} />

        {/* items-stretch + fill keeps the editor and the details panel the same height. */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <CodeMirrorEditor
              value={sqlContent}
              onChange={setSqlContent}
              minHeight="480px"
              fill
              t={t}
            />
          </div>
          <aside className="self-start rounded-lg border bg-card p-5 lg:col-span-4">
            <ScriptMetadataForm
              formData={formData}
              onFormChange={handleFormChange}
              t={t}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
