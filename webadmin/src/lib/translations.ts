import vi from "../locales/vi.json";
import en from "../locales/en.json";
import type { Language } from "./language";
import { humanizeTranslationKey } from "./i18nFallback";

export const translations = {
  vi,
  en,
} as const;

export type { Language } from "./language";

function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj || !path) return undefined;
  if (obj[path] !== undefined && typeof obj[path] === "string") return obj[path];
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

export function translate(
  lang: Language,
  key: string,
  params?: Record<string, string | number>
): string {
  const currentDict = translations[lang] || translations.vi;
  let val = getNestedValue(currentDict, key) || getNestedValue(translations.vi, key) || humanizeTranslationKey(key);
  if (params) {
    for (const [name, replacement] of Object.entries(params)) {
      val = val.replaceAll(`{${name}}`, String(replacement));
    }
  }
  return val;
}
