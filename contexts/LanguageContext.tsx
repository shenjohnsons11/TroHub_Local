import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>("vi");

  useEffect(() => {
    void (async () => {
      try {
        const stored = (await AsyncStorage.getItem(STORAGE_KEY)) || (await AsyncStorage.getItem(FALLBACK_KEY));
        if (stored === "vi" || stored === "en") setLanguageState(stored as Language);
      } catch {}
    })();
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
    void AsyncStorage.setItem(FALLBACK_KEY, next).catch(() => undefined);
  }, []);

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

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
