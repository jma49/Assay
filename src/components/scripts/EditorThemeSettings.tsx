"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Palette,
  Type,
  Zap,
  RotateCcw,
  Sun,
  Moon,
} from "lucide-react";

interface EditorThemeSettingsProps {
  t?: (key: string) => string;
}

// 浅色主题配置
const LIGHT_THEMES = [
  { value: "eclipse", label: "Eclipse", icon: Sun },
  { value: "githubLight", label: "GitHub Light", icon: Sun },
  { value: "materialLight", label: "Material Light", icon: Sun },
  { value: "nord", label: "Nord Light", icon: Sun },
  { value: "solarizedLight", label: "Solarized Light", icon: Sun },
];

// 暗色主题配置
const DARK_THEMES = [
  { value: "tokyoNight", label: "Tokyo Night", icon: Moon },
  { value: "okaidia", label: "Okaidia Dark", icon: Moon },
  { value: "dracula", label: "Dracula", icon: Moon },
  { value: "materialDark", label: "Material Dark", icon: Moon },
  { value: "solarizedDark", label: "Solarized Dark", icon: Moon },
];

// 可用的字体家族
const FONT_FAMILIES = [
  { value: "fira-code", label: "Fira Code", style: "'Fira Code', monospace" },
  { value: "jetbrains-mono", label: "JetBrains Mono", style: "'JetBrains Mono', monospace" },
  { value: "source-code-pro", label: "Source Code Pro", style: "'Source Code Pro', monospace" },
  { value: "cascadia-code", label: "Cascadia Code", style: "'Cascadia Code', monospace" },
  { value: "monaco", label: "Monaco", style: "Monaco, monospace" },
  { value: "consolas", label: "Consolas", style: "Consolas, monospace" },
];

const EditorThemeSettings: React.FC<EditorThemeSettingsProps> = ({
  t = (key) => key,
}) => {
  const { theme: systemTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [editorTheme, setEditorTheme] = useState("");
  const [fontFamily, setFontFamily] = useState("fira-code");
  const [fontSize, setFontSize] = useState([14]);

  // 根据系统主题获取默认编辑器主题
  const getDefaultTheme = useCallback(() => {
    return systemTheme === "dark" ? "tokyoNight" : "eclipse";
  }, [systemTheme]);

  // 根据系统主题获取可用主题列表
  const getAvailableThemes = useCallback(() => {
    return systemTheme === "dark" ? DARK_THEMES : LIGHT_THEMES;
  }, [systemTheme]);

  // 从localStorage读取设置
  useEffect(() => {
    const savedEditorTheme = localStorage.getItem("editor-theme");
    const savedFontFamily = localStorage.getItem("editor-font-family") || "fira-code";
    const savedFontSize = localStorage.getItem("editor-font-size") || "14";

    // 如果没有保存的主题或保存的主题不在当前可用主题列表中，使用默认主题
    const availableThemes = getAvailableThemes();
    const themeExists = savedEditorTheme && availableThemes.some(theme => theme.value === savedEditorTheme);
    
    setEditorTheme(themeExists ? savedEditorTheme : getDefaultTheme());
    setFontFamily(savedFontFamily);
    setFontSize([parseInt(savedFontSize)]);
  }, [systemTheme, getAvailableThemes, getDefaultTheme]);

  // 监听系统主题变化，自动切换到对应的默认主题
  useEffect(() => {
    const currentTheme = localStorage.getItem("editor-theme");
    const availableThemes = getAvailableThemes();
    const themeExists = currentTheme && availableThemes.some(theme => theme.value === currentTheme);
    
    if (!themeExists) {
      const defaultTheme = getDefaultTheme();
      setEditorTheme(defaultTheme);
      localStorage.setItem("editor-theme", defaultTheme);
      
      // 触发主题变更事件
      window.dispatchEvent(new CustomEvent('editorThemeChange', { 
        detail: { theme: defaultTheme } 
      }));
    }
  }, [systemTheme, getAvailableThemes, getDefaultTheme]);

  // 保存设置到localStorage
  const saveSettings = () => {
    localStorage.setItem("editor-theme", editorTheme);
    localStorage.setItem("editor-font-family", fontFamily);
    localStorage.setItem("editor-font-size", fontSize[0].toString());
  };

  // 重置为默认值
  const resetToDefaults = () => {
    const defaultTheme = getDefaultTheme();
    setEditorTheme(defaultTheme);
    setFontFamily("fira-code");
    setFontSize([14]);
    localStorage.setItem("editor-theme", defaultTheme);
    localStorage.removeItem("editor-font-family");
    localStorage.removeItem("editor-font-size");
  };

  // 应用设置
  const applySettings = () => {
    saveSettings();

    // 应用字体样式到编辑器
    const selectedFont = FONT_FAMILIES.find(f => f.value === fontFamily);
    if (selectedFont) {
      document.documentElement.style.setProperty("--editor-font-family", selectedFont.style);
    }
    document.documentElement.style.setProperty("--editor-font-size", `${fontSize[0]}px`);
    
    // 应用编辑器主题
    document.documentElement.style.setProperty("--editor-theme", editorTheme);

    // 触发自定义事件通知编辑器主题变更
    window.dispatchEvent(new CustomEvent('editorThemeChange', { 
      detail: { theme: editorTheme } 
    }));

    setIsOpen(false);
  };

  const availableThemes = getAvailableThemes();
  const currentThemeLabel = availableThemes.find(theme => theme.value === editorTheme)?.label || editorTheme;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs gap-2 hover:bg-primary/10 hover:border-primary/50"
        >
          <Settings className="h-3.5 w-3.5" />
          {t("themeSettings") || "主题设置"}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 ring-2 ring-primary/20">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                {t("editorThemeSettings") || "编辑器主题设置"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {t("settingsApplyImmediately") || "设置立即应用"} • {systemTheme === "dark" ? t("darkMode") : t("lightMode")}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 主题选择 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium">
                {t("editorTheme") || "编辑器主题"} ({systemTheme === "dark" ? t("darkTheme") : t("lightTheme")})
              </Label>
            </div>
            <Select value={editorTheme} onValueChange={setEditorTheme}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableThemes.map((theme) => (
                  <SelectItem key={theme.value} value={theme.value}>
                    <div className="flex items-center gap-2">
                      <theme.icon className="h-4 w-4" />
                      <span>{theme.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {systemTheme === "dark" 
                ? t("themeHelpDark") 
                : t("themeHelpLight")
              }
            </p>
          </div>

          {/* 字体家族 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium">{t("fontFamily") || "字体家族"}</Label>
            </div>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    <span style={{ fontFamily: font.style }}>{font.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 字体大小 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium">{t("fontSize") || "字体大小"}: {fontSize[0]}px</Label>
            </div>
            <div className="px-2">
              <Slider
                value={fontSize}
                onValueChange={setFontSize}
                max={24}
                min={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>10px</span>
                <span>15px</span>
                <span>20px</span>
                <span>24px</span>
              </div>
            </div>
          </div>

          {/* 当前设置预览 */}
          <div className="space-y-3 p-4 bg-muted/40 rounded-lg border">
            <h4 className="font-medium text-sm">{t("currentSettings") || "当前设置"}</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-700">
                {systemTheme === "dark" ? t("darkTheme") : t("lightTheme")}: {currentThemeLabel}
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 dark:bg-green-950/20 dark:text-green-400 dark:border-green-700">
                {t("fontLabel")}: {FONT_FAMILIES.find(f => f.value === fontFamily)?.label}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-700">
                {t("fontSize")}: {fontSize[0]}px
              </Badge>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {t("resetDefaults") || "重置默认"}
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {t("cancelButton") || "取消"}
            </Button>
            <Button onClick={applySettings} className="gap-2">
              <Zap className="h-4 w-4" />
              {t("applySettings") || "应用设置"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditorThemeSettings; 