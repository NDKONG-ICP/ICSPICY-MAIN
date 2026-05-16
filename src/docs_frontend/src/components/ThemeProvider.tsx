import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "ic-spicy-docs-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  if (document.documentElement.classList.contains("light")) return "light";
  if (document.documentElement.classList.contains("dark")) return "dark";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readInitialTheme());

  const applyTheme = useCallback((next: Theme) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(next);
    root.style.colorScheme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
