"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ThemeMode = "light" | "dark";

const storageKey = "trohub_theme";

type ThemeContextValue = {
  themeMode: ThemeMode;
  mounted: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
}

function persist(mode: ThemeMode) {
  try {
    localStorage.setItem(storageKey, mode);
  } catch {
    // Theme still works for this session when storage is unavailable.
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeModeRef = useRef<ThemeMode>("light");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const systemTheme: ThemeMode = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    let mode = systemTheme;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "light" || stored === "dark") {
        mode = stored;
      }
    } catch {
      // Fall back to the system theme when storage is unavailable.
    } finally {
      themeModeRef.current = mode;
      applyTheme(mode);
      setThemeMode(mode);
      setMounted(true);
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const next = event.newValue === "light" || event.newValue === "dark"
        ? event.newValue
        : systemTheme;
      themeModeRef.current = next;
      applyTheme(next);
      setThemeMode(next);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    themeModeRef.current = mode;
    applyTheme(mode);
    setThemeMode(mode);
    persist(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = themeModeRef.current === "dark" ? "light" : "dark";
    themeModeRef.current = next;
    applyTheme(next);
    setThemeMode(next);
    persist(next);
  }, []);

  const value = useMemo(
    () => ({ themeMode, mounted, setTheme, toggleTheme }),
    [mounted, setTheme, themeMode, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
