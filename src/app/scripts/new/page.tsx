"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import UserHeader from "@/components/layout/UserHeader";
import { APP_CONTAINER } from "@/components/layout/app-container";
import {
  ScriptMetadataForm,
  ScriptFormData,
} from "@/components/business/scripts/ScriptMetadataForm";
import CodeMirrorEditor from "@/components/business/scripts/CodeMirrorEditor";
import { useLanguage } from "@/components/common/LanguageProvider";
import {
  dashboardTranslations,
  DashboardTranslationKeys,
} from "@/components/business/dashboard/types";
import { validateReadOnlySql } from "@/lib/sql/read-only-validator";

const SCRIPT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const INITIAL_SQL = `-- A check passes when this query returns no rows.
-- Return the rows that need attention, for example:
SELECT id, created_at
FROM your_table
WHERE status IS NULL;
`;

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
  const { user } = useUser();
  const { language } = useLanguage();
  const c = copy[language];

  const [formData, setFormData] = useState<ScriptFormData>(initialFormData);
  const [sqlContent, setSqlContent] = useState(INITIAL_SQL);
  const [scriptIdEdited, setScriptIdEdited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const t = useCallback(
    (key: DashboardTranslationKeys | string): string => {
      const translations = dashboardTranslations[language] || dashboardTranslations.en;
      return translations[key as keyof typeof translations] || key.toString();
    },
    [language],
  );

  // Prefill the author once the signed-in user is known; the API falls back to it anyway.
  useEffect(() => {
    const defaultAuthor =
      user?.fullName || user?.primaryEmailAddress?.emailAddress?.split("@")[0];
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

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.scriptId.trim() || !sqlContent.trim()) {
      toast.error(c.missing);
      return;
    }
    if (!SCRIPT_ID_PATTERN.test(formData.scriptId)) {
      toast.error(c.badId);
      return;
    }
    const validation = validateReadOnlySql(sqlContent);
    if (!validation.isValid) {
      toast.error(validation.reason);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, sqlContent }),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(c.failed, { description: result.message || response.statusText });
        return;
      }
      if (result.requiresApproval) {
        toast.success(c.submitted, { description: c.submittedDesc });
      } else {
        toast.success(c.saved);
      }
      router.push("/manage-scripts");
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
      <UserHeader />
      <main className={`${APP_CONTAINER} space-y-8 py-8`}>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-[13px] text-muted-foreground">
              <Link href="/manage-scripts" className="hover:text-foreground">
                {c.breadcrumb}
              </Link>{" "}
              / {c.title}
            </p>
            <h1 className="text-[28px] leading-tight font-semibold">{c.title}</h1>
            <p className="text-sm text-muted-foreground">{c.lead}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/manage-scripts")} disabled={isSaving}>
              {c.cancel}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? c.saving : c.save}
            </Button>
          </div>
        </header>

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
      <Toaster />
    </div>
  );
}
