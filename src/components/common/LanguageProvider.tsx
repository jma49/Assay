"use client";

import React, { useContext, useEffect, createContext, useMemo, useSyncExternalStore } from "react";
import { createLanguageStore } from "./language-store";

// Language context type
interface LanguageContextType {
  language: "en" | "zh";
  setLanguage: (lang: "en" | "zh") => void;
}

// Language context
const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
});

// Custom hook for using language context
export const useLanguage = () => useContext(LanguageContext);

// Component props
interface LanguageProviderProps {
  children: React.ReactNode;
}

// The choice is remembered per browser. The server and the first client
// render use English so they match; the saved choice applies right after.
const languageStore = createLanguageStore("assay-language", () => (typeof window === "undefined" ? undefined : window.localStorage));

export function LanguageProvider({ children }: LanguageProviderProps) {
  const language = useSyncExternalStore(languageStore.subscribe, languageStore.getSnapshot, languageStore.getServerSnapshot);
  const setLanguage = languageStore.set;

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
