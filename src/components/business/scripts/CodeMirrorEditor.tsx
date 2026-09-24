import React, { useState, useEffect } from "react";
import ReactCodeMirror, { ReactCodeMirrorProps } from "@uiw/react-codemirror";
import { sql, PostgreSQL, SQLDialect } from "@codemirror/lang-sql";
import { okaidia } from "@uiw/codemirror-theme-okaidia";
import { githubLight } from "@uiw/codemirror-theme-github";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { nord } from "@uiw/codemirror-theme-nord";
import { materialLight, materialDark } from "@uiw/codemirror-theme-material";
import { eclipse } from "@uiw/codemirror-theme-eclipse";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { solarizedLight, solarizedDark } from "@uiw/codemirror-theme-solarized";
import { useTheme } from "next-themes";
// import { format } from 'sql-formatter';
import { Button } from "@/components/ui/button";
import { AlignLeft, Code, Eye, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { sqlValidationMessage, validateReadOnlySql } from "@/lib/sql/read-only-validator";
import { toast } from "sonner";
import { useLanguage } from "@/components/common/LanguageProvider";
import { DashboardTranslationKeys } from "../dashboard/types";
import EditorThemeSettings from "./EditorThemeSettings";
import AIAssistantPanel from "@/components/business/ai/AIAssistantPanel";
import dynamic from "next/dynamic";

// Pulls in a syntax highlighter; only load it when an analysis is shown.
const AnalysisResultDialog = dynamic(() => import("@/components/business/ai/AnalysisResultDialog"), { ssr: false });

interface CodeMirrorEditorProps
  extends Omit<
    ReactCodeMirrorProps,
    "value" | "onChange" | "extensions" | "theme"
  > {
  value: string;
  onChange: (value: string) => void;
  minHeight?: string;
  /** Grow to the parent's height (minHeight stays the floor). */
  fill?: boolean;
  t?: (key: DashboardTranslationKeys | string) => string;
}

// 主题映射表 - 包含所有可用的主题
const THEME_MAP = {
  // 浅色主题
  eclipse: eclipse,
  githubLight: githubLight,
  materialLight: materialLight,
  nord: nord,
  solarizedLight: solarizedLight,

  // 暗色主题
  tokyoNight: tokyoNight,
  okaidia: okaidia,
  dracula: dracula,
  materialDark: materialDark,
  solarizedDark: solarizedDark,
};

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  minHeight = "300px",
  fill = false,
  t = (key) => key.toString(),
  ...rest
}) => {
  const { theme: systemTheme } = useTheme();
  const [showPreview, setShowPreview] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [isFormatting, setIsFormatting] = useState(false);
  const [editorTheme, setEditorTheme] = useState<string>("eclipse");

  // AI功能相关状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<'explain' | 'optimize'>('explain');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);

  // 获取当前应用的编辑器主题
  const getCurrentEditorTheme = React.useMemo(() => {
    // 根据主题名称获取主题对象
    const themeObj = THEME_MAP[editorTheme as keyof typeof THEME_MAP];

    if (themeObj) {
      return themeObj;
    }

    // 如果主题不存在，根据系统主题返回默认主题
    return systemTheme === "dark" ? tokyoNight : eclipse;
  }, [editorTheme, systemTheme]);

  // 从localStorage读取编辑器主题设置
  useEffect(() => {
    const savedTheme = localStorage.getItem("editor-theme");

    if (savedTheme && THEME_MAP[savedTheme as keyof typeof THEME_MAP]) {
      setEditorTheme(savedTheme);
    } else {
      // 如果没有保存的主题或主题不存在，使用默认主题
      const defaultTheme = systemTheme === "dark" ? "tokyoNight" : "eclipse";
      setEditorTheme(defaultTheme);
      localStorage.setItem("editor-theme", defaultTheme);
    }
  }, [systemTheme]);

  // 监听主题变更事件
  useEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      const newTheme = event.detail.theme;
      if (THEME_MAP[newTheme as keyof typeof THEME_MAP]) {
        setEditorTheme(newTheme);
      }
    };

    window.addEventListener('editorThemeChange', handleThemeChange as EventListener);

    return () => {
      window.removeEventListener('editorThemeChange', handleThemeChange as EventListener);
    };
  }, []);

  // 创建支持PostgreSQL的扩展，包括对dollar-quoted字符串的更好支持
  const postgresExtensions = React.useMemo(() => {
    // 创建自定义PostgreSQL方言，禁用$$的字符串处理以改善DO块语法高亮
    const customPostgres = SQLDialect.define({
      ...PostgreSQL.spec,
      doubleDollarQuotedStrings: false, // 禁用$$字符串处理以改善DO块语法高亮
    });

    const postgresConfig = {
      dialect: customPostgres,
      upperCaseKeywords: false,
      schema: {
        // 添加一些常见的PostgreSQL函数和关键字以改善自动完成
        pg_catalog: [
          "now",
          "current_timestamp",
          "current_date",
          "current_time",
        ],
        functions: [
          "declare",
          "begin",
          "end",
          "loop",
          "if",
          "then",
          "else",
          "elsif",
          "raise",
          "notice",
        ],
      },
    };

    return [sql(postgresConfig)];
  }, []);

  const handleFormat = async () => {
    if (!value.trim()) {
      toast.warning(t("noCodeToFormat") || "没有代码需要格式化");
      return;
    }

    setIsFormatting(true);
    try {
      console.log("开始SQL格式化...");

      // 基础清理
      const cleanedValue = value
        .replace(/\r\n/g, '\n')  // 统一换行符
        .replace(/\t/g, '  ')    // 将tab转换为空格
        .trim();

      let formatted = cleanedValue;

      try {
        // 尝试使用sql-formatter进行专业格式化
        const { format } = await import("sql-formatter");

        formatted = format(cleanedValue, {
          language: "postgresql",
          keywordCase: "upper",
          dataTypeCase: "upper",
          functionCase: "upper",
          identifierCase: "preserve",
          indentStyle: "standard",
          tabWidth: 2,
          useTabs: false,
          logicalOperatorNewline: "before",
          expressionWidth: 60,
          linesBetweenQueries: 1,
          denseOperators: false,
          newlineBeforeSemicolon: false,
        });

        console.log("sql-formatter格式化成功");

      } catch (formatterError) {
        console.warn("sql-formatter失败，使用基础格式化:", formatterError);

        // 基础格式化作为fallback - 修复逻辑
        const lines = cleanedValue.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // 合并所有行为一个字符串
        let singleLine = lines.join(' ');

        // 压缩多余空格
        singleLine = singleLine.replace(/\s+/g, ' ').trim();

        // 在关键字前添加换行
        const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'ORDER BY', 'GROUP BY', 'HAVING', 'WITH', 'UNION', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'LIMIT'];
        keywords.forEach(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          singleLine = singleLine.replace(regex, `\n${keyword}`);
        });

        // 在AND/OR前添加换行并缩进
        singleLine = singleLine.replace(/\b(AND|OR)\b/gi, '\n  $1');

        // 在逗号后添加换行和缩进（仅在SELECT子句中）
        const selectRegex = /(SELECT[^FROM]*)/gi;
        singleLine = singleLine.replace(selectRegex, (match) => {
          return match.replace(/,\s*/g, ',\n  ');
        });

        // 在分号后添加空行
        singleLine = singleLine.replace(/;\s*/g, ';\n\n');

        // 清理格式：移除开头的换行，清理多余空行
        formatted = singleLine
          .split('\n')
          .map(line => line.trim())
          .filter((line, index, array) => {
            // 保留非空行，或者前后都有内容的空行
            return line.length > 0 || (index > 0 && index < array.length - 1 && array[index - 1].length > 0 && array[index + 1].length > 0);
          })
          .join('\n')
          .replace(/\n\s*\n\s*\n+/g, '\n\n') // 最多保留一个空行
          .trim();
      }

      // 应用格式化结果
      onChange(formatted);

      // 成功提示
      toast.success(isZh ? "格式化成功" : "Formatted", {
        description: isZh ? "SQL代码已格式化" : "The query was reformatted.",
        duration: 3000,
      });

    } catch (error) {
      console.error("格式化过程出错:", error);
      toast.error(isZh ? "格式化失败" : "Could not format the query", {
        description: error instanceof Error ? error.message : "未知错误",
        duration: 5000,
      });
    } finally {
      setIsFormatting(false);
    }
  };

  const getLineCount = (text: string) => text.split("\n").length;

  // AI生成SQL函数
  const handleGenerateSql = async (prompt: string) => {
    if (!prompt.trim()) {
      toast.warning(isZh ? "请输入SQL生成描述" : "Describe the check you want first");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI生成SQL失败');
      }

      const data = await response.json();

      if (data.success && data.sql) {
        onChange(data.sql);
        toast.success(isZh ? "AI已成功生成SQL语句" : "Query generated", {
          description: isZh ? "SQL已插入到编辑器中" : "It is now in the editor.",
          duration: 3000,
        });
      } else {
        throw new Error('AI返回数据格式错误');
      }
    } catch (error) {
      console.error('AI生成SQL错误:', error);
      toast.error(isZh ? "AI生成SQL失败" : "Could not generate a query", {
        description: error instanceof Error ? error.message : '未知错误',
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // AI分析SQL函数
  const handleAnalyzeSql = async (type: 'explain' | 'optimize') => {
    if (!value.trim()) {
      toast.warning(isZh ? "请先输入SQL语句" : "Write a query first");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisType(type);
    try {
      const response = await fetch('/api/ai/analyze-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: value,
          analysisType: type
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI分析SQL失败');
      }

      const data = await response.json();

      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
        setIsAnalysisDialogOpen(true);
        toast.success(type === 'explain' ? "AI解释已生成" : "AI优化建议已生成", {
          description: isZh ? "点击查看详细分析结果" : "Open it to read the analysis.",
          duration: 3000,
        });
      } else {
        throw new Error('AI返回数据格式错误');
      }
    } catch (error) {
      console.error('AI分析SQL错误:', error);
      toast.error(isZh ? "AI分析SQL失败" : "Could not analyze the query", {
        description: error instanceof Error ? error.message : '未知错误',
        duration: 5000,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const validation = React.useMemo(
    () => (value.trim() ? validateReadOnlySql(value) : null),
    [value],
  );

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", fill && "flex h-full flex-col")}>
      <div className="flex h-11 items-center justify-between gap-2 border-b bg-muted/40 px-4">
        <div className="flex min-w-0 items-center gap-3 text-[13px]">
          <span className="font-medium">SQL</span>
          <span className="text-muted-foreground tabular-nums">
            {getLineCount(value)} {t("codeStatisticsLines")}
          </span>
        </div>

        <div className="-mr-2 flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAI(!showAI)}
            aria-pressed={showAI}
            className={cn("h-8 px-2.5 text-[13px]", showAI && "bg-accent")}
          >
            <Sparkles className="size-3.5" />
            AI
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFormat}
            disabled={isFormatting || !value.trim()}
            className="h-8 px-2.5 text-[13px]"
          >
            <AlignLeft className="size-3.5" />
            {isFormatting ? t("formatting") : t("formatCode")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-8 px-2.5 text-[13px]"
          >
            {showPreview ? <Code className="size-3.5" /> : <Eye className="size-3.5" />}
            {showPreview ? t("editMode") : t("previewMode")}
          </Button>
          <EditorThemeSettings t={t} />
        </div>
      </div>

      {showAI && (
        <AIAssistantPanel
          value={value}
          onAnalyze={handleAnalyzeSql}
          onGenerate={handleGenerateSql}
          isGenerating={isGenerating}
          isAnalyzing={isAnalyzing}
        />
      )}

      {showPreview ? (
        <pre
          className={cn("overflow-auto whitespace-pre-wrap bg-muted/30 p-4 font-mono text-sm", fill && "flex-1")}
          style={{ minHeight }}
        >
          {value || <span className="text-muted-foreground">{t("noCodeContent")}</span>}
        </pre>
      ) : (
        <div className={cn(fill && "relative flex-1")} style={fill ? { minHeight } : undefined}>
        <ReactCodeMirror
          value={value}
          onChange={onChange}
          extensions={postgresExtensions}
          theme={getCurrentEditorTheme}
          height={fill ? "100%" : "auto"}
          minHeight={fill ? undefined : minHeight}
          basicSetup={{
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
          }}
          className={cn("text-sm", fill && "absolute inset-0")}
          style={{
            fontFamily: "var(--editor-font-family, var(--font-mono))",
            fontSize: "var(--editor-font-size, 14px)",
          }}
          placeholder={t("sqlPlaceholder")}
          {...rest}
        />
        </div>
      )}

      <div className="flex h-9 items-center justify-between gap-4 border-t px-4 text-[12px]">
        {validation === null ? (
          <span className="text-muted-foreground">
            {isZh ? "写一条查询，查出结果即表示需要关注" : "Write a query; any rows it returns need attention"}
          </span>
        ) : validation.isValid ? (
          <span className="inline-flex items-center gap-2 text-success">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            {isZh ? "只读查询，可以保存" : "Read-only, ready to save"}
          </span>
        ) : (
          <span className="inline-flex min-w-0 items-center gap-2 text-failure">
            <span className="size-1.5 shrink-0 rounded-full bg-failure" aria-hidden />
            <span className="truncate">{sqlValidationMessage(validation, isZh ? "zh" : "en")}</span>
          </span>
        )}
        <span className="shrink-0 text-muted-foreground">PostgreSQL</span>
      </div>

      {isAnalysisDialogOpen && (
      <AnalysisResultDialog
        isOpen={isAnalysisDialogOpen}
        onOpenChange={setIsAnalysisDialogOpen}
        result={analysisResult}
        type={analysisType}
      />
      )}
    </div>
  );
};

export default CodeMirrorEditor;
