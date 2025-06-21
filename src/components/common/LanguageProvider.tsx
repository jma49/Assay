"use client";

import React, {
  useState,
  useContext,
  useEffect,
  createContext,
  useMemo,
} from "react";

// Language context type
interface LanguageContextType {
  language: "en" | "zh";
  setLanguage: (lang: "en" | "zh") => void;
}

// Language context
export const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
});

// Custom hook for using language context
export const useLanguage = () => useContext(LanguageContext);

// Component props
interface LanguageProviderProps {
  children: React.ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<"en" | "zh">("en"); // 默认英文

  useEffect(() => {
    // 设置页面语言属性
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  // 使用useMemo避免value对象每次都重新创建
  const value = useMemo(
    () => ({
      language,
      setLanguage,
    }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
