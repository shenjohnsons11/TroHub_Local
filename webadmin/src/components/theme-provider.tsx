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

export type ThemeMode = "light" | "dark" | "system";

const storageKey = "trohub_theme";

type ThemeContextValue = {
  themeMode: ThemeMode;
  mounted: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getActiveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    const hour = new Date().getHours();
    const isNight = hour >= 18 || hour < 6;
    const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return (isNight || prefersDark) ? "dark" : "light";
  }
  return mode;
}

function applyTheme(mode: ThemeMode) {
  const active = getActiveTheme(mode);
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", active === "dark");
  }
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
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const systemTheme: ThemeMode = mediaQuery.matches ? "dark" : "light";
    let mode: ThemeMode = "system";

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "light" || stored === "dark" || stored === "system") {
        mode = stored as ThemeMode;
      }
    } catch {
      mode = "system";
    } finally {
      themeModeRef.current = mode;
      applyTheme(mode);
      setThemeMode(mode);
      setMounted(true);
    }

    const handleChange = () => {
      if (themeModeRef.current === "system") {
        applyTheme("system");
        setThemeMode("system");
      }
    };

    const interval = setInterval(() => {
      if (themeModeRef.current === "system") {
        applyTheme("system");
        setThemeMode("system");
      }
    }, 60000); // 1 minute checks for hour transition

    mediaQuery.addEventListener("change", handleChange);
    
    // Also listen to storage events for cross-tab sync
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const next = (event.newValue === "light" || event.newValue === "dark" || event.newValue === "system")
        ? (event.newValue as ThemeMode)
        : "system";
      themeModeRef.current = next;
      applyTheme(next);
      setThemeMode(next);
    };

    window.addEventListener("storage", handleStorage);
    
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    themeModeRef.current = mode;
    applyTheme(mode);
    setThemeMode(mode);
    persist(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    let next: ThemeMode = "light";
    if (themeModeRef.current === "light") {
      next = "dark";
    } else if (themeModeRef.current === "dark") {
      next = "system";
    } else {
      next = "light";
    }
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
