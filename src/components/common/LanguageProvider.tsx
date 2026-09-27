"use client";

import React, {
  useState,
  useCallback,
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

const LANGUAGE_KEY = "assay-language";

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<"en" | "zh">("en");

  // The choice is remembered per browser. It is read after mount so the
  // server-rendered English page and the first client render still match.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_KEY);
      if (saved === "en" || saved === "zh") setLanguageState(saved);
    } catch {
      // Storage blocked: stay in English.
    }
  }, []);

  const setLanguage = useCallback((next: "en" | "zh") => {
    setLanguageState(next);
    try {
      localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // Storage blocked: the choice still applies to this visit.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

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
