"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { mounted, themeMode, toggleTheme } = useTheme();
  const dark = themeMode === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={!mounted}
      className="theme-icon-button"
      aria-label={dark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      title={dark ? "Chế độ sáng" : "Chế độ tối"}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  );
}
