"use client";

import dynamic from "next/dynamic";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DashboardTranslationKeys } from "@/components/business/dashboard/types";
import { ScriptMetadataForm, type ScriptFormData } from "../ScriptMetadataForm";
import { useDataSourceOptions } from "@/components/checks/data-source/useDataSourceOptions";
import { stillNeededHint, toFormMetadata, type DialogMode, type Language, type ScriptFormState } from "./script-form";

// CodeMirror and its themes are large; load them only where the editor renders.
const CodeMirrorEditor = dynamic(() => import("../CodeMirrorEditor"), {
  ssr: false,
  loading: () => <div className="h-[480px] animate-pulse rounded-lg border bg-muted/40" />,
});

interface ScriptEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: DialogMode;
  form: ScriptFormState;
  sql: string;
  onSqlChange: (sql: string) => void;
  onFieldChange: (field: keyof ScriptFormData, value: string | boolean | string[]) => void;
  onSave: () => void;
  isSubmitting: boolean;
  language: Language;
  t: (key: DashboardTranslationKeys | string) => string;
}

export function ScriptEditorDialog({
  open,
  onOpenChange,
  mode,
  form,
  sql,
  onSqlChange,
  onFieldChange,
  onSave,
  isSubmitting,
  language,
  t,
}: ScriptEditorDialogProps) {
  const formMetadata = toFormMetadata(form);
  const hint = stillNeededHint(form, sql, language);
  const dataSources = useDataSourceOptions(language, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[70vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? t("addScriptDialogTitle") : t("editScriptDialogTitle")}</DialogTitle>
          <DialogDescription>
            {mode === "add" ? (
              t("scriptMetadataDesc")
            ) : (
              <span className="font-mono">{formMetadata.scriptId}</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-2 space-y-4 py-2">
          <ScriptMetadataForm
            formData={formMetadata}
            onFormChange={onFieldChange}
            t={t}
            isEditMode={mode === "edit"}
            dataSources={dataSources}
          />
          <div>
            <label className="text-body-md font-medium mb-1 block">
              {t("fieldSqlContent")}{" "}
              <span className="text-destructive">*</span>
            </label>
            <CodeMirrorEditor value={sql} onChange={onSqlChange} minHeight="250px" t={t} dataSourceId={formMetadata.dataSourceId} />
          </div>
        </div>
        <DialogFooter className="pt-4 border-t">
          {/* The editor's status bar already reports the read-only check. */}
          <div className="flex-1 text-body-sm">
            {hint && <span className="text-attention">{hint}</span>}
          </div>

          <div className="flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                {t("cancelButton")}
              </Button>
            </DialogClose>
            <Button type="button" onClick={onSave} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-0 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-0 h-4 w-4" />
              )}
              {t("saveScriptButton")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
