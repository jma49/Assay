"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ScriptMetadataForm,
  ScriptFormData,
} from "@/components/scripts/ScriptMetadataForm";
import { useLanguage } from "@/components/LanguageProvider"; // 使用新的语言provider
import {
  dashboardTranslations,
  DashboardTranslationKeys,
} from "@/components/dashboard/types"; // For t function and keys
import { toast } from "sonner";
// Import the new CodeMirror component
import CodeMirrorEditor from "@/components/scripts/CodeMirrorEditor";
// Import the template generator
import { generateSqlTemplateWithTranslation } from "@/components/dashboard/scriptTranslations";
import { Label } from "@/components/ui/label"; // Keep Label import

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

// Helper function to generate script ID from name
const generateScriptIdFromName = (name: string): string => {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, "") // Remove invalid characters
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens (just in case)
};

export default function NewScriptPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [formData, setFormData] = useState<ScriptFormData>(initialFormData);

  // Generate initial SQL content using the template generator
  // We pass default/empty values initially, the template generator handles defaults
  const [sqlContent, setSqlContent] = useState<string>(() =>
    generateSqlTemplateWithTranslation(
      initialFormData.scriptId,
      initialFormData.name,
      initialFormData.description,
      initialFormData.scope,
      initialFormData.author,
      // Note: The template generator currently only uses scriptId for translation lookup,
      // which will be empty here. Ideally, it could generate based on name/desc fields
      // after user interaction, or we update the template logic.
      // For now, it generates a basic template with current date.
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  // Track if scriptId was manually edited to prevent overwriting user input
  const [scriptIdManuallyEdited, setScriptIdManuallyEdited] = useState(false);

  const t = useCallback(
    (key: DashboardTranslationKeys | string): string => {
      const langTranslations =
        dashboardTranslations[language] || dashboardTranslations.en;
      // Allow string type for key to accommodate new keys not yet in DashboardTranslationKeys strict type
      return (
        langTranslations[key as keyof typeof langTranslations] || key.toString()
      );
    },
    [language],
  );

  const handleFormChange = (
    fieldName: keyof ScriptFormData,
    value: string | boolean | string[],
  ) => {
    let newScriptId = formData.scriptId;
    let isManuallyEditingScriptId = scriptIdManuallyEdited;

    if (fieldName === "scriptId" && typeof value === "string") {
      isManuallyEditingScriptId = true;
      setScriptIdManuallyEdited(true);
      newScriptId = value;
    } else if (
      fieldName === "name" &&
      typeof value === "string" &&
      !isManuallyEditingScriptId
    ) {
      newScriptId = generateScriptIdFromName(value);
    } else {
      // For other fields or if value is boolean or string[], scriptId logic doesn't apply directly here
    }

    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
      scriptId: newScriptId,
    }));
  };

  const handleSqlContentChange = (content: string) => {
    setSqlContent(content);
  };

  const handleSaveScript = async () => {
    setIsSaving(true);
    // Basic client-side validation
    if (
      !formData.scriptId.trim() ||
      !formData.name.trim() ||
      !sqlContent.trim()
    ) {
      toast.error(
        t("fillRequiredFieldsError") ||
          "Please fill all required fields: Script ID, Name, and SQL Content.",
      );
      setIsSaving(false);
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.scriptId)) {
      toast.error(
        t("invalidScriptIdError") ||
          "Invalid Script ID format. Use lowercase letters, numbers, and hyphens.",
      );
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sqlContent,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(t("scriptSavedSuccess") || "Script saved successfully!");
        router.push("/"); // Navigate to dashboard
      } else {
        toast.error(
          `${t("scriptSaveError") || "Failed to save script:"} ${result.message || response.statusText}`,
        );
      }
    } catch (error) {
      console.error("Error saving script:", error);
      toast.error(
        `${t("scriptSaveError") || "Failed to save script."} An unexpected error occurred.`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/"); // Navigate back to dashboard
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {t("createScriptTitle") || "Create New SQL Script"}
        </h1>
        {/* Optional: Add a subtitle or breadcrumbs here */}
      </header>

      <ScriptMetadataForm
        formData={formData}
        onFormChange={handleFormChange}
        t={t}
        isEditMode={false}
      />

      {/* CodeMirror SQL Editor Section */}
      <div className="mt-6 space-y-2">
        <Label htmlFor="sqlContent">
          {t("fieldSqlContent") || "SQL Content"}{" "}
          <span className="text-destructive">*</span>
        </Label>
        <CodeMirrorEditor
          value={sqlContent}
          onChange={handleSqlContentChange}
          minHeight="350px"
        />
      </div>

      <div className="flex justify-end items-center space-x-3 pt-6 mt-6 border-t">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={isSaving}
          className="w-28"
        >
          {t("cancelButton") || "Cancel"}
        </Button>
        <Button onClick={handleSaveScript} disabled={isSaving} className="w-28">
          {isSaving
            ? t("savingStatusText") || "Saving..."
            : t("saveScriptButton") || "Save Script"}
        </Button>
      </div>
    </div>
  );
}
