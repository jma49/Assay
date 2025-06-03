"use client";

import React, { useState, useContext, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Type for translations
type TranslationKeys =
  | "title"
  | "description"
  | "internalTool"
  | "changeLanguage"
  | "english"
  | "chinese"
  | "footerText";

// Language context type
interface LanguageContextType {
  language: "en" | "zh";
  setLanguage: (lang: "en" | "zh") => void;
  t: (key: TranslationKeys) => string;
}

// Language context
export const LanguageContext = React.createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: TranslationKeys) => key,
});

// Translations object
const layoutTranslations: Record<
  "en" | "zh",
  Record<TranslationKeys, string>
> = {
  en: {
    title: "SQL Script Automation Tool",
    description: "Internal system for monitoring SQL data quality.",
    internalTool: "Internal Tool",
    changeLanguage: "Change language",
    english: "English",
    chinese: "中文",
    footerText: "Designed By Jincheng",
  },
  zh: {
    title: "SQL 脚本自动化执行工具",
    description: "内部SQL数据质量监控系统",
    internalTool: "内部工具",
    changeLanguage: "切换语言",
    english: "English",
    chinese: "中文",
    footerText: "由 Jincheng 设计",
  },
};

// Custom hook for using language context
// Export it so components like Dashboard can use it
export const useLanguage = () => useContext(LanguageContext);

// Component props
interface ClientLayoutWrapperProps {
  children: React.ReactNode;
  fontClassName: string; // Pass font class from layout
}

export function ClientLayoutWrapper({
  children,
  fontClassName,
}: ClientLayoutWrapperProps) {
  const [language, setLanguage] = useState<"en" | "zh">("en");

  const t = (key: TranslationKeys) => {
    return layoutTranslations[language][key] || key;
  };

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {/* Apply font class here */}
      <body className={`${fontClassName} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="min-h-screen flex flex-col">
            <header className="bg-card text-card-foreground border-b border-border py-4 sticky top-0 z-50 backdrop-blur-sm">
              <div className="container mx-auto px-4">
                <div className="flex justify-between items-center">
                  {/* Use local t for header title */}
                  <h1 className="text-xl font-bold">{t("title")}</h1>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="text-xs sm:text-sm bg-primary/10 text-primary px-2 py-1 sm:px-3 rounded-full whitespace-nowrap">
                      {t("internalTool")}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-full w-8 h-8 sm:w-9 sm:h-9"
                        >
                          <Globe className="h-[1rem] w-[1rem] sm:h-[1.2rem] sm:w-[1.2rem]" />
                          <span className="sr-only">{t("changeLanguage")}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setLanguage("en")}
                          disabled={language === "en"}
                        >
                          {t("english")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setLanguage("zh")}
                          disabled={language === "zh"}
                        >
                          {t("chinese")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </header>
            <main className="flex-grow container mx-auto px-4 py-6">
              {children}
            </main>
            <footer className="bg-card text-card-foreground border-t border-border py-4">
              <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} {t("footerText")}
              </div>
            </footer>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </LanguageContext.Provider>
  );
}
