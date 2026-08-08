"use client";

import { useLanguage, type Language } from "./language-provider";

export function LanguageToggle() {
  const { language, changeLanguage, t } = useLanguage();
  const options: Array<{ value: Language; label: string }> = [{ value: "vi", label: "🇻🇳 VI" }, { value: "en", label: "🇬🇧 EN" }];
  return <div className="inline-flex min-h-11 rounded-xl border border-border bg-card p-1" role="group" aria-label={t("language")}>
    {options.map((option) => <button key={option.value} type="button" onClick={() => changeLanguage(option.value)} aria-pressed={language === option.value} className={`min-h-9 rounded-lg px-2 text-xs font-extrabold ${language === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>{option.label}</button>)}
  </div>;
}
