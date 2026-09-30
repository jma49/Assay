import React, { useMemo, useState } from "react";
import ReactCodeMirror, { ReactCodeMirrorProps } from "@uiw/react-codemirror";
import dynamic from "next/dynamic";
import { AlignLeft, Code, Eye, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/common/LanguageProvider";
import AIAssistantPanel from "@/components/business/ai/AIAssistantPanel";
import { useMe } from "@/lib/auth/use-me";
import { cn } from "@/lib/utils/utils";
import { DashboardTranslationKeys } from "../dashboard/types";
import EditorThemeSettings from "./EditorThemeSettings";
import { EditorStatusBar } from "./editor/EditorStatusBar";
import { postgresExtensions } from "./editor/postgres";
import { formatSql } from "./editor/sql-format";
import { useEditorTheme } from "./editor/useEditorTheme";
import { useSqlAssistant } from "./editor/useSqlAssistant";

// Pulls in a syntax highlighter; only load it when an analysis is shown.
const AnalysisResultDialog = dynamic(() => import("@/components/business/ai/AnalysisResultDialog"), { ssr: false });

interface CodeMirrorEditorProps extends Omit<ReactCodeMirrorProps, "value" | "onChange" | "extensions" | "theme"> {
  value: string;
  onChange: (value: string) => void;
  minHeight?: string;
  /** Grow to the parent's height (minHeight stays the floor). */
  fill?: boolean;
  /** The source the check runs against: the AI assistant drafts and dry-runs on it. */
  dataSourceId?: string;
  t?: (key: DashboardTranslationKeys | string) => string;
}

const BASIC_SETUP = {
  lineNumbers: true,
  foldGutter: true,
  highlightActiveLineGutter: true,
  highlightSpecialChars: true,
  history: true,
  drawSelection: true,
  dropCursor: true,
  allowMultipleSelections: true,
  indentOnInput: true,
  syntaxHighlighting: true,
  autocompletion: true,
  bracketMatching: true,
  closeBrackets: true,
  highlightActiveLine: true,
  searchKeymap: true,
};

/** The SQL editor: toolbar (AI, format, preview, theme), CodeMirror and the read-only status. */
const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  minHeight = "300px",
  fill = false,
  t = (key) => key.toString(),
  dataSourceId,
  ...rest
}) => {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const aiAvailable = useMe()?.ai === true;
  const theme = useEditorTheme();
  const extensions = useMemo(() => postgresExtensions(), []);
  const assistant = useSqlAssistant(value, language, onChange, dataSourceId);
  const [showPreview, setShowPreview] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const lineCount = value.split("\n").length;

  const handleFormat = async () => {
    if (!value.trim()) {
      toast.warning(t("noCodeToFormat") || "没有代码需要格式化");
      return;
    }
    setIsFormatting(true);
    try {
      onChange(await formatSql(value));
      toast.success(isZh ? "格式化成功" : "Formatted", {
        description: isZh ? "SQL代码已格式化" : "The query was reformatted.",
        duration: 3000,
      });
    } catch (error) {
      console.error("SQL formatting failed:", error);
      toast.error(isZh ? "格式化失败" : "Could not format the query", {
        description: error instanceof Error ? error.message : isZh ? "未知错误" : "Unknown error",
        duration: 5000,
      });
    } finally {
      setIsFormatting(false);
    }
  };

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", fill && "flex h-full flex-col")}>
      <div className="flex h-11 items-center justify-between gap-2 border-b bg-muted/40 px-4">
        <div className="flex min-w-0 items-center gap-3 text-body-sm">
          <span className="font-medium">SQL</span>
          <span className="text-muted-foreground tabular-nums">
            {lineCount} {t(lineCount === 1 ? "codeStatisticsLine" : "codeStatisticsLines")}
          </span>
        </div>

        <div className="-mr-2 flex items-center gap-0.5">
          {aiAvailable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAI(!showAI)}
              aria-pressed={showAI}
              className={cn("h-8 px-2.5 text-body-sm", showAI && "bg-accent")}
            >
              <Sparkles className="size-3.5" />
              AI
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={handleFormat} disabled={isFormatting || !value.trim()} className="h-8 px-2.5 text-body-sm">
            <AlignLeft className="size-3.5" />
            {isFormatting ? t("formatting") : t("formatCode")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} className="h-8 px-2.5 text-body-sm">
            {showPreview ? <Code className="size-3.5" /> : <Eye className="size-3.5" />}
            {showPreview ? t("editMode") : t("previewMode")}
          </Button>
          <EditorThemeSettings t={t} />
        </div>
      </div>

      {aiAvailable && showAI && (
        <AIAssistantPanel
          value={value}
          onAnalyze={assistant.analyze}
          onGenerate={assistant.generate}
          isGenerating={assistant.isGenerating}
          isAnalyzing={assistant.isAnalyzing}
        />
      )}

      {showPreview ? (
        <pre className={cn("overflow-auto whitespace-pre-wrap bg-muted/30 p-4 font-mono text-body-md", fill && "flex-1")} style={{ minHeight }}>
          {value || <span className="text-muted-foreground">{t("noCodeContent")}</span>}
        </pre>
      ) : (
        <div className={cn(fill && "relative flex-1")} style={fill ? { minHeight } : undefined}>
          <ReactCodeMirror
            value={value}
            onChange={onChange}
            extensions={extensions}
            theme={theme}
            height={fill ? "100%" : "auto"}
            minHeight={fill ? undefined : minHeight}
            basicSetup={BASIC_SETUP}
            className={cn("text-body-md", fill && "absolute inset-0")}
            style={{
              fontFamily: "var(--editor-font-family, var(--font-mono))",
              fontSize: "var(--editor-font-size, 14px)",
            }}
            placeholder={t("sqlPlaceholder")}
            {...rest}
          />
        </div>
      )}

      <EditorStatusBar sql={value} language={language} />

      {assistant.analysis.open && (
        <AnalysisResultDialog
          isOpen={assistant.analysis.open}
          onOpenChange={assistant.setAnalysisOpen}
          result={assistant.analysis.text}
          type={assistant.analysis.type}
        />
      )}
    </div>
  );
};

export default CodeMirrorEditor;
