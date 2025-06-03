import React, { useState } from "react";
import ReactCodeMirror, { ReactCodeMirrorProps } from "@uiw/react-codemirror";
import { sql, PostgreSQL, SQLDialect } from "@codemirror/lang-sql";
// 导入多个主题
import { okaidia } from "@uiw/codemirror-theme-okaidia";
import { githubLight } from "@uiw/codemirror-theme-github";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { monokai } from "@uiw/codemirror-theme-monokai";
import { nord } from "@uiw/codemirror-theme-nord";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { solarizedLight, solarizedDark } from "@uiw/codemirror-theme-solarized";
import { eclipse } from "@uiw/codemirror-theme-eclipse";
import { whiteLight } from "@uiw/codemirror-theme-white";
import { basicLight, basicDark } from "@uiw/codemirror-theme-basic";
import { useTheme } from "next-themes";
// 导入 CodeMirror 扩展相关
import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
// import { format } from 'sql-formatter';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code, Sparkles, Eye, FileCode, Palette, Settings } from "lucide-react";
import { toast } from "sonner";
import { DashboardTranslationKeys } from "../dashboard/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// 主题配置
const THEMES = {
  light: {
    github: { theme: githubLight, name: "GitHub Light" },
    solarizedLight: { theme: solarizedLight, name: "Solarized Light" },
    eclipse: { theme: eclipse, name: "Eclipse" },
    white: { theme: whiteLight, name: "Pure White" },
    basicLight: { theme: basicLight, name: "Basic Light" },
  },
  dark: {
    okaidia: { theme: okaidia, name: "Okaidia" },
    dracula: { theme: dracula, name: "Dracula" },
    monokai: { theme: monokai, name: "Monokai" },
    nord: { theme: nord, name: "Nord" },
    tokyoNight: { theme: tokyoNight, name: "Tokyo Night" },
    vscode: { theme: vscodeDark, name: "VS Code Dark" },
    solarizedDark: { theme: solarizedDark, name: "Solarized Dark" },
    basicDark: { theme: basicDark, name: "Basic Dark" },
  },
};

// 字体选项
const FONT_OPTIONS = [
  { value: "default", name: "默认等宽字体" },
  { value: "'Fira Code', monospace", name: "Fira Code" },
  { value: "'JetBrains Mono', monospace", name: "JetBrains Mono" },
  { value: "'Source Code Pro', monospace", name: "Source Code Pro" },
  { value: "'Monaco', monospace", name: "Monaco" },
  { value: "'Consolas', monospace", name: "Consolas" },
  { value: "'Ubuntu Mono', monospace", name: "Ubuntu Mono" },
  { value: "'Cascadia Code', monospace", name: "Cascadia Code" },
];

interface CodeMirrorEditorProps
  extends Omit<
    ReactCodeMirrorProps,
    "value" | "onChange" | "extensions" | "theme"
  > {
  value: string;
  onChange: (value: string) => void;
  minHeight?: string;
  t?: (key: DashboardTranslationKeys | string) => string;
}

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  minHeight = "300px",
  t = (key) => key.toString(),
  ...rest
}) => {
  const { theme: currentTheme } = useTheme();
  const [showPreview, setShowPreview] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // 主题和字体状态
  const [selectedTheme, setSelectedTheme] = useState<string>(
    currentTheme === "dark" ? "tokyoNight" : "eclipse"
  );
  const [selectedFont, setSelectedFont] = useState("'Fira Code', monospace");
  const [fontSize, setFontSize] = useState(14);

  // 创建字体样式扩展
  const fontStyleExtension = React.useMemo((): Extension => {
    return EditorView.theme({
      "&": {
        fontFamily: selectedFont === "default" ? "monospace" : selectedFont,
        fontSize: `${fontSize}px`,
      },
      ".cm-content": {
        fontFamily: selectedFont === "default" ? "monospace" : selectedFont,
        fontSize: `${fontSize}px`,
        lineHeight: "1.6",
      },
      ".cm-editor": {
        fontFamily: selectedFont === "default" ? "monospace" : selectedFont,
        fontSize: `${fontSize}px`,
      },
    });
  }, [selectedFont, fontSize]);

  // 获取当前主题
  const editorTheme = React.useMemo(() => {
    if (currentTheme === "dark") {
      const darkThemes = THEMES.dark;
      switch (selectedTheme) {
        case "okaidia": return darkThemes.okaidia.theme;
        case "dracula": return darkThemes.dracula.theme;
        case "monokai": return darkThemes.monokai.theme;
        case "nord": return darkThemes.nord.theme;
        case "tokyoNight": return darkThemes.tokyoNight.theme;
        case "vscode": return darkThemes.vscode.theme;
        case "solarizedDark": return darkThemes.solarizedDark.theme;
        case "basicDark": return darkThemes.basicDark.theme;
        default: return tokyoNight;
      }
    } else {
      const lightThemes = THEMES.light;
      switch (selectedTheme) {
        case "github": return lightThemes.github.theme;
        case "solarizedLight": return lightThemes.solarizedLight.theme;
        case "eclipse": return lightThemes.eclipse.theme;
        case "white": return lightThemes.white.theme;
        case "basicLight": return lightThemes.basicLight.theme;
        default: return eclipse;
      }
    }
  }, [currentTheme, selectedTheme]);

  // 获取当前可用主题选项
  const availableThemes = React.useMemo(() => {
    return currentTheme === "dark" ? THEMES.dark : THEMES.light;
  }, [currentTheme]);

  // 更新主题时自动切换
  React.useEffect(() => {
    const defaultTheme = currentTheme === "dark" ? "tokyoNight" : "eclipse";
    if (!availableThemes[selectedTheme as keyof typeof availableThemes]) {
      setSelectedTheme(defaultTheme);
    }
  }, [currentTheme, selectedTheme, availableThemes]);

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

    return [sql(postgresConfig), fontStyleExtension];
  }, [fontStyleExtension]);

  const handleFormat = async () => {
    if (!value.trim()) {
      toast.warning(t("noCodeToFormat"));
      return;
    }

    setIsFormatting(true);
    try {
      console.log("正在检测SQL代码类型...");

      // 检测DO$$块语法
      const hasDoBlock = /\bdo\s*\$\$[\s\S]*?\$\$/i.test(value);

      if (hasDoBlock) {
        console.log("检测到DO$$块，跳过自动格式化");

        // 对于DO$$块，提供友好的提示但不进行格式化
        const title = t("doBlockDetected");
        const description = t("doBlockDetectedDesc");

        toast.info(title, {
          description: description,
          duration: 5000,
        });

        return;
      }

      // 对于普通SQL，使用sql-formatter进行格式化
      console.log("普通SQL代码，使用sql-formatter格式化");

      const { format } = await import("sql-formatter");

      const formatted = format(value, {
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

      onChange(formatted);

      // 双语成功通知
      const successTitle = t("formatSuccess");
      const successDesc = t("formatSuccessDesc");

      toast.success(successTitle, {
        description: successDesc,
        duration: 3000,
      });
    } catch (error) {
      console.error("SQL格式化错误:", error);

      // 双语错误通知
      const errorTitle = t("formatError");
      const errorDesc = t("formatErrorDesc");

      toast.error(errorTitle, {
        description: errorDesc,
        duration: 5000,
      });
    } finally {
      setIsFormatting(false);
    }
  };

  const getLineCount = (text: string) => text.split("\n").length;
  const getCharCount = (text: string) => text.length;

  return (
    <div className="space-y-4">
      {/* 编辑器工具栏 */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/40 to-muted/20 rounded-lg border border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 ring-2 ring-primary/20">
              <FileCode className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                {t("sqlEditorTitle")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("sqlEditorDescription")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 代码统计 */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-background/60 border border-border/40">
            <Badge
              variant="outline"
              className="text-xs bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-700"
            >
              {getLineCount(value)} {t("codeStatisticsLines")}
            </Badge>
            <Badge
              variant="outline"
              className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-700"
            >
              {getCharCount(value)} {t("codeStatisticsChars")}
            </Badge>
          </div>

          {/* 预览切换 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-8 px-3 text-xs"
          >
            {showPreview ? (
              <>
                <Code className="h-3.5 w-3.5 mr-1.5" />
                {t("editMode")}
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                {t("previewMode")}
              </>
            )}
          </Button>

          {/* 格式化按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFormat}
            disabled={isFormatting || !value.trim()}
            className="h-8 px-3 text-xs shadow-sm transition-all duration-200 hover:shadow-md hover:bg-primary/10 hover:border-primary/50 hover:text-primary focus:ring-2 focus:ring-primary/20"
          >
            {isFormatting ? (
              <>
                <div className="animate-spin h-3.5 w-3.5 mr-1.5 border-2 border-current border-t-transparent rounded-full" />
                {t("formatting")}
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {t("formatCode")}
              </>
            )}
          </Button>

          {/* 设置按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="h-8 px-3 text-xs shadow-sm transition-all duration-200 hover:shadow-md hover:bg-primary/10 hover:border-primary/50 hover:text-primary focus:ring-2 focus:ring-primary/20"
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            {t("themeSettings")}
          </Button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="p-6 bg-gradient-to-br from-muted/20 via-muted/10 to-background/80 rounded-xl border border-border/40 shadow-lg space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 ring-2 ring-primary/20">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-base text-foreground">
                  {t("editorThemeSettings")}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {t("settingsAppliedInstantly")}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTheme(currentTheme === "dark" ? "tokyoNight" : "eclipse");
                setSelectedFont("'Fira Code', monospace");
                setFontSize(14);
                toast.success(t("themeApplied"), {
                  description: t("resetToDefaults"),
                });
              }}
              className="text-xs"
            >
              {t("resetToDefaults")}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 主题选择 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium text-foreground">
                  {t("themeSelection")}
                </Label>
              </div>
              <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                <SelectTrigger className="h-10 text-sm border-border/60 hover:border-border focus:border-primary">
                  <SelectValue placeholder={t("selectTheme")} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(availableThemes).map(([key, themeInfo]) => (
                    <SelectItem key={key} value={key} className="text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary/50 to-primary border border-primary/30"></div>
                        {themeInfo.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 字体选择 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium text-foreground">
                  {t("fontFamily")}
                </Label>
              </div>
              <Select value={selectedFont} onValueChange={setSelectedFont}>
                <SelectTrigger className="h-10 text-sm border-border/60 hover:border-border focus:border-primary">
                  <SelectValue placeholder={t("selectFont")} />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: font.value === "default" ? "monospace" : font.value }}>
                          Aa
                        </span>
                        {font.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 字体大小 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium text-foreground">
                  {t("fontSizeLabel")}: {fontSize}px
                </Label>
              </div>
              <div className="space-y-3">
                <input
                  type="range"
                  min="10"
                  max="20"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-muted to-muted/50 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, rgb(var(--primary)) 0%, rgb(var(--primary)) ${
                      ((fontSize - 10) / 10) * 100
                    }%, rgb(var(--muted)) ${((fontSize - 10) / 10) * 100}%, rgb(var(--muted)) 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10px</span>
                  <span>15px</span>
                  <span>20px</span>
                </div>
              </div>
            </div>
          </div>

          {/* 当前设置信息 */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-primary/30 bg-primary/5 text-primary">
                {t("currentTheme")}: {(() => {
                  if (currentTheme === "dark") {
                    const darkTheme = THEMES.dark[selectedTheme as keyof typeof THEMES.dark];
                    return darkTheme?.name || t("unknownScript");
                  } else {
                    const lightTheme = THEMES.light[selectedTheme as keyof typeof THEMES.light];
                    return lightTheme?.name || t("unknownScript");
                  }
                })()}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-700">
                {t("currentMode")}: {currentTheme === "dark" ? t("darkMode") : t("lightMode")}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-700">
                {t("currentFont")}: {FONT_OPTIONS.find(f => f.value === selectedFont)?.name}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* 编辑器容器 */}
      <div className="relative overflow-hidden rounded-lg border-2 border-border/40 bg-gradient-to-br from-background via-background to-muted/5 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-border/60">
        {/* 装饰性顶部条 */}
        <div className="h-1 bg-gradient-to-r from-primary/60 via-primary/40 to-primary/60"></div>

        {showPreview ? (
          // 预览模式
          <div className="p-6 bg-gradient-to-br from-muted/10 to-muted/5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {t("sqlPreviewLabel")}
              </span>
            </div>
            <pre className="whitespace-pre-wrap text-sm font-mono bg-background/80 border border-border/40 rounded-md p-4 max-h-96 overflow-auto">
              {value || (
                <span className="italic text-muted-foreground">
                  {t("noCodeContent")}
                </span>
              )}
            </pre>
          </div>
        ) : (
          // 编辑模式
          <div className="relative">
            <ReactCodeMirror
              value={value}
              onChange={onChange}
              extensions={postgresExtensions}
              theme={editorTheme}
              height="auto"
              minHeight={minHeight}
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
              className="text-sm leading-relaxed"
              placeholder={t("sqlPlaceholder")}
              {...rest}
            />

            {/* 编辑器状态指示器 */}
            <div className="absolute bottom-2 right-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-background/90 backdrop-blur-sm border border-border/40 shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-muted-foreground font-mono">
                  {t("editorStatusReady")}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 编辑器提示信息 */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-lg border border-blue-200/60 dark:border-blue-800/60">
        <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/40">
          <Palette className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="text-xs text-blue-700 dark:text-blue-300">
          <span className="font-medium">{t("editorHelpTitle")}</span>{" "}
          {t("editorHelpText")}
        </div>
      </div>
    </div>
  );
};

export default CodeMirrorEditor;
