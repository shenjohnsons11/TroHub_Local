"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translations, type TranslationKey } from "@/lib/translations";
import { safeStorageString } from "@/lib/client-storage";

export type Language = "vi" | "en";
type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (key: TranslationKey, params?: Record<string, string | number>) => string };
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
const storageKey = "trohub_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("vi");

  useEffect(() => {
    try {
      const stored = safeStorageString(localStorage.getItem(storageKey));
      if (stored === "vi" || stored === "en") setLanguageState(stored);
    } catch {}
  }, []);

  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try { localStorage.setItem(storageKey, next); } catch {}
  }, []);
  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>) => {
    let value: string = translations[language][key] || translations.vi[key];
    for (const [name, replacement] of Object.entries(params || {})) value = value.replaceAll(`{${name}}`, String(replacement));
    return value;
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
