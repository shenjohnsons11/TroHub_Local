import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { TROHUB_THEMES } from "../constants/theme";

export type ThemeMode = "light" | "dark" | "system";

const storageKey = "trohub_theme";

type ThemeContextValue = {
  themeMode: ThemeMode;
  resolvedTheme: "light" | "dark";
  theme: (typeof TROHUB_THEMES)["light" | "dark"];
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const userInteracted = useRef(false);
  const themeModeRef = useRef<ThemeMode>("system");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [currentTimeHour, setCurrentTimeHour] = useState(() => new Date().getHours());

  const persist = useCallback((mode: ThemeMode) => {
    void AsyncStorage.setItem(storageKey, mode).catch(() => undefined);
  }, []);

  // Update current time hour periodically to trigger auto mode transition
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimeHour(new Date().getHours());
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Sync initial theme mode from storage
  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(storageKey).then((storedTheme) => {
      if (
        active &&
        !userInteracted.current &&
        (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system")
      ) {
        themeModeRef.current = storedTheme as ThemeMode;
        setThemeMode(storedTheme as ThemeMode);
      }
    }).catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const getActiveTheme = useCallback((mode: ThemeMode): "light" | "dark" => {
    if (mode === "system") {
      const isNightTime = currentTimeHour >= 18 || currentTimeHour < 6;
      const prefersDark = systemScheme === "dark";
      return (isNightTime || prefersDark) ? "dark" : "light";
    }
    return mode;
  }, [systemScheme, currentTimeHour]);

  const resolvedTheme = useMemo(() => getActiveTheme(themeMode), [themeMode, getActiveTheme]);
  const theme = useMemo(() => TROHUB_THEMES[resolvedTheme], [resolvedTheme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    userInteracted.current = true;
    themeModeRef.current = mode;
    setThemeMode(mode);
    persist(mode);
  }, [persist]);

  const toggleTheme = useCallback(() => {
    let next: ThemeMode = "light";
    if (themeModeRef.current === "light") {
      next = "dark";
    } else if (themeModeRef.current === "dark") {
      next = "system";
    } else {
      next = "light";
    }
    userInteracted.current = true;
    themeModeRef.current = next;
    setThemeMode(next);
    persist(next);
  }, [persist]);

  const value = useMemo(
    () => ({
      themeMode,
      resolvedTheme,
      theme,
      setTheme,
      toggleTheme,
    }),
    [setTheme, themeMode, resolvedTheme, theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }

  return context;
}
