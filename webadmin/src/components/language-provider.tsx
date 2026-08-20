"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { translate } from "@/lib/translations";
import { normalizeLanguage, resolveLanguageTarget, type Language } from "@/lib/language";
import { safeStorageString } from "@/lib/client-storage";

export type { Language };

type LanguageContextValue = {
  language: Language;
  changeLanguage: (language?: Language) => void;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
const STORAGE_KEY = "trohub_lang";
const FALLBACK_KEY = "trohub_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("vi");
  const languageRef = useRef<Language>("vi");

  useEffect(() => {
    try {
      const legacy = safeStorageString(localStorage.getItem(FALLBACK_KEY));
      const stored = safeStorageString(localStorage.getItem(STORAGE_KEY)) || legacy;
      const next = normalizeLanguage(stored) || "vi";
      languageRef.current = next;
      setLanguageState(next);
      if (legacy) {
        localStorage.setItem(STORAGE_KEY, next);
        localStorage.removeItem(FALLBACK_KEY);
      }
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const changeLanguage = useCallback((requested?: Language) => {
    const target = resolveLanguageTarget(languageRef.current, requested);
    languageRef.current = target;
    setLanguageState(target);
    try {
      localStorage.setItem(STORAGE_KEY, target);
      localStorage.removeItem(FALLBACK_KEY);
    } catch {}
  }, []);

  const setLanguage = useCallback((next: Language) => changeLanguage(next), [changeLanguage]);
  const toggleLanguage = useCallback(() => changeLanguage(), [changeLanguage]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(language, key, params);
    },
    [language]
  );

  const value = useMemo(() => ({ language, changeLanguage, setLanguage, toggleLanguage, t }), [language, changeLanguage, setLanguage, toggleLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
