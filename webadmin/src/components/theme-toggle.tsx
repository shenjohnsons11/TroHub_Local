"use client";

import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "./theme-provider";
import { useLanguage } from "./language-provider";

export function ThemeToggle() {
  const { mounted, themeMode, toggleTheme } = useTheme();
  const { t } = useLanguage();

  if (!mounted) return <div className="size-10" />;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-icon-button"
      aria-label={
        themeMode === "light"
          ? t("i18n.theme.toDark")
          : themeMode === "dark"
            ? t("i18n.theme.toSystem")
            : t("i18n.theme.toLight")
      }
      title={
        themeMode === "light"
          ? t("i18n.theme.lightActive")
          : themeMode === "dark"
            ? t("i18n.theme.darkActive")
            : t("i18n.theme.systemActive")
      }
    >
      {themeMode === "light" ? (
        <Sun aria-hidden="true" />
      ) : themeMode === "dark" ? (
        <Moon aria-hidden="true" />
      ) : (
        <Laptop aria-hidden="true" className="text-primary" />
      )}
    </button>
  );
}
