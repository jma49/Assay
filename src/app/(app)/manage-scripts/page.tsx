"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ScriptsFinder } from "@/components/business/scripts/ScriptsFinder";
import { EditHistoryDialog } from "@/components/business/scripts/EditHistoryDialog";
import { DeleteScriptDialog } from "@/components/business/scripts/manage/DeleteScriptDialog";
import { ManageScriptsHeader } from "@/components/business/scripts/manage/ManageScriptsHeader";
import { ScriptEditorDialog } from "@/components/business/scripts/manage/ScriptEditorDialog";
import { useScriptDelete } from "@/components/business/scripts/manage/useScriptDelete";
import { useScriptEditor } from "@/components/business/scripts/manage/useScriptEditor";
import { useScriptList } from "@/components/business/scripts/manage/useScriptList";
import { DashboardTranslationKeys, dashboardTranslations } from "@/components/business/dashboard/types";
import { useLanguage } from "@/components/common/LanguageProvider";
import { SkeletonTable } from "@/components/common/PageSkeletons";

const ManageScriptsContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [historyScriptId, setHistoryScriptId] = useState("");
  const [isEditHistoryOpen, setIsEditHistoryOpen] = useState(false);

  const t = useCallback(
    (key: DashboardTranslationKeys | string): string => {
      const langTranslations = dashboardTranslations[language] || dashboardTranslations.en;
      return (langTranslations as Record<string, string>)[key] || key;
    },
    [language],
  );

  const { scripts, isLoading, error, reload } = useScriptList();
  const editor = useScriptEditor(language, t, reload);
  const deletion = useScriptDelete(language, t, reload);

  // Links from runs and coverage select a check (?scriptId=); editing stays one click away.
  const linkedScriptId = searchParams.get("scriptId");

  const rejectBlankId = (scriptId: string) => {
    if (scriptId && scriptId.trim() !== "") return false;
    toast.error(language === "zh" ? "无效的脚本ID" : "Invalid script ID");
    return true;
  };

  const openEditHistory = (scriptId: string) => {
    if (rejectBlankId(scriptId)) return;
    setHistoryScriptId(scriptId);
    setIsEditHistoryOpen(true);
    toast.info(language === "zh" ? "正在加载编辑历史" : "Loading edit history", {
      description: language === "zh" ? `脚本ID: ${scriptId}` : `Script ID: ${scriptId}`,
      duration: 2000,
    });
  };

  const openRunHistory = (scriptId: string) => {
    if (rejectBlankId(scriptId)) return;
    const trimmed = scriptId.trim();
    toast.info(language === "zh" ? "正在跳转到执行历史" : "Opening run history", {
      description: language === "zh" ? `将搜索脚本: ${trimmed}` : `Filtering by ${trimmed}`,
      duration: 2000,
    });
    router.push(`/dashboard?search=${encodeURIComponent(trimmed)}#execution-history`);
  };

  return (
    <div className="min-h-screen    ">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-4 animate-fadeIn">
          <ManageScriptsHeader
            scripts={scripts}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            language={language}
            t={t}
          />

          {isLoading && scripts.length === 0 ? (
            <SkeletonTable rows={8} withTitle={false} />
          ) : error ? (
            <div className="rounded-xl bg-card shadow-border p-8 text-center">
              <AlertTriangle className="mx-auto mb-3 size-10 text-failure" />
              <p className="font-medium">{t("errorTitle")}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">{error}</p>
            </div>
          ) : (
            <ScriptsFinder
              scripts={scripts}
              searchTerm={searchTerm}
              language={language}
              onEdit={(script) => editor.open("edit", script)}
              onEditHistory={openEditHistory}
              onRunHistory={openRunHistory}
              onDelete={deletion.ask}
              initialSelectedId={linkedScriptId}
            />
          )}
        </div>
      </div>

      <ScriptEditorDialog
        open={editor.isOpen}
        onOpenChange={editor.setIsOpen}
        mode={editor.mode}
        form={editor.form}
        sql={editor.sql}
        onSqlChange={editor.setSql}
        onFieldChange={editor.changeField}
        onSave={editor.save}
        isSubmitting={editor.isSubmitting}
        language={language}
        t={t}
      />

      <DeleteScriptDialog
        open={deletion.isOpen}
        onOpenChange={deletion.setIsOpen}
        script={deletion.target}
        onCancel={deletion.cancel}
        onConfirm={deletion.confirm}
        isSubmitting={deletion.isSubmitting}
        t={t}
      />

      {isEditHistoryOpen && historyScriptId && (
        <EditHistoryDialog
          open={isEditHistoryOpen}
          onOpenChange={setIsEditHistoryOpen}
          scriptId={historyScriptId}
          t={t}
        />
      )}
    </div>
  );
};

const ManageScriptsPage = () => {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <ManageScriptsContent />
    </Suspense>
  );
};

export default ManageScriptsPage;
