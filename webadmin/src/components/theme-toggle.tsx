"use client";

import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { mounted, themeMode, toggleTheme } = useTheme();

  if (!mounted) return <div className="size-10" />;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-icon-button"
      aria-label={
        themeMode === "light"
          ? "Chuyển sang chế độ tối"
          : themeMode === "dark"
            ? "Chuyển sang chế độ tự động"
            : "Chuyển sang chế độ sáng"
      }
      title={
        themeMode === "light"
          ? "Đang bật: Chế độ sáng"
          : themeMode === "dark"
            ? "Đang bật: Chế độ tối"
            : "Đang bật: Giao diện tự động (Theo giờ / Hệ thống)"
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
