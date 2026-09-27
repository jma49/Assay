"use client";

import { useCallback } from "react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { translateDashboard, type DashboardTranslationKeys } from "./translations";

/**
 * `t()` over the legacy dashboard string table, in the current UI language.
 * Keys are checked against the table; components still typed for any string key ask for `useDashboardT<string>()`.
 */
export function useDashboardT<Key extends string = DashboardTranslationKeys>(): (key: Key) => string {
  const { language } = useLanguage();
  return useCallback((key: Key) => translateDashboard(language, key), [language]);
}
