import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import viDict from "../locales/vi.json";
import enDict from "../locales/en.json";

export type Language = "vi" | "en";
const STORAGE_KEY = "trohub_lang";
const FALLBACK_KEY = "trohub_language";

const copy = {
  vi: viDict,
  en: enDict,
};

function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj || !path) return undefined;
  if (typeof obj[path] === "string") return obj[path];
  const parts = path.split(".");
  let curr = obj;
  for (const part of parts) {
    if (curr && typeof curr === "object" && part in curr) {
      curr = curr[part];
    } else {
      return undefined;
    }
  }
  return typeof curr === "string" ? curr : undefined;
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>("vi");
  const languageRef = useRef<Language>("vi");
  const userInteracted = useRef(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const legacy = stored ? null : await AsyncStorage.getItem(FALLBACK_KEY);
        const next = (stored || legacy || "vi").toLowerCase();

        if (active && !userInteracted.current && (next === "vi" || next === "en")) {
          languageRef.current = next;
          setLanguageState(next);
        }
        if (legacy && (next === "vi" || next === "en")) {
          await AsyncStorage.setItem(STORAGE_KEY, next);
          await AsyncStorage.removeItem(FALLBACK_KEY);
        }
      } catch {}
    })();

    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback(async (next: Language) => {
    userInteracted.current = true;
    languageRef.current = next;
    setLanguageState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  const toggleLanguage = useCallback(async () => {
    const nextLang = languageRef.current === "vi" ? "en" : "vi";
    await setLanguage(nextLang);
  }, [setLanguage]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const currentDict = copy[language] || copy.vi;
      let val = getNestedValue(currentDict, key) || getNestedValue(copy.vi, key) || key;
      if (params) {
        for (const [name, replacement] of Object.entries(params)) {
          val = val.replaceAll(`{${name}}`, String(replacement));
        }
      }
      return val;
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, toggleLanguage, t }), [language, setLanguage, toggleLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}

export const useTranslation = useLanguage;
