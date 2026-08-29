"use client";

import React from "react";
import { useLanguage } from "@/components/language-provider";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, changeLanguage, t } = useLanguage();

  return (
    <div className={`inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 p-1 text-xs font-semibold ${className}`}>
      <button
        type="button"
        onClick={() => changeLanguage("vi")}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all ${
          language === "vi"
            ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-xs font-bold"
            : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
<<<<<<< HEAD
        aria-label={t("language.switchVietnamese")}
=======
        aria-label={t("i18n.language.switchVietnamese")}
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
      >
        <span className="text-sm">🇻🇳</span>
        <span>VIE</span>
      </button>
      <button
        type="button"
        onClick={() => changeLanguage("en")}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all ${
          language === "en"
            ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-xs font-bold"
            : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
<<<<<<< HEAD
        aria-label={t("language.switchEnglish")}
=======
        aria-label={t("i18n.language.switchEnglish")}
>>>>>>> 4f72ce23515f29b0ae0f0ee497972d42eabbb95e
      >
        <span className="text-sm">🇬🇧</span>
        <span>ENG</span>
      </button>
    </div>
  );
}
