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

export type ThemeMode = "light" | "dark";

const storageKey = "trohub_theme";

type ThemeContextValue = {
  themeMode: ThemeMode;
  theme: (typeof TROHUB_THEMES)[ThemeMode];
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();
  const initialTheme = systemTheme === "dark" ? "dark" : "light";
  const userInteracted = useRef(false);
  const themeModeRef = useRef<ThemeMode>(initialTheme);
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialTheme);

  const persist = useCallback((mode: ThemeMode) => {
    void AsyncStorage.setItem(storageKey, mode).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(storageKey).then((storedTheme) => {
      if (
        active &&
        !userInteracted.current &&
        (storedTheme === "light" || storedTheme === "dark")
      ) {
        themeModeRef.current = storedTheme;
        setThemeMode(storedTheme);
      }
    }).catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    userInteracted.current = true;
    themeModeRef.current = mode;
    setThemeMode(mode);
    persist(mode);
  }, [persist]);

  const toggleTheme = useCallback(() => {
    const next = themeModeRef.current === "dark" ? "light" : "dark";
    userInteracted.current = true;
    themeModeRef.current = next;
    setThemeMode(next);
    persist(next);
  }, [persist]);

  const value = useMemo(
    () => ({
      themeMode,
      theme: TROHUB_THEMES[themeMode],
      setTheme,
      toggleTheme,
    }),
    [setTheme, themeMode, toggleTheme],
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
