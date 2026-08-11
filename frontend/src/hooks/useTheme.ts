import { useEffect, useState } from "react";
import { applyTheme, getSavedTheme, type Theme } from "../services/theme";
import { useUserStore } from "../modules/auth/stores/useUserStore";

export function useTheme(): {
  theme: Theme;
  updateTheme: (theme: Theme) => void;
  toggleTheme: () => void;
} {
  const savedProfileTheme = useUserStore((s) => s.userProfile?.preferences.theme);
  const [theme, setTheme] = useState<Theme>(savedProfileTheme || getSavedTheme());

  useEffect(() => {
    if (savedProfileTheme) {
      setTheme(savedProfileTheme);
    }
  }, [savedProfileTheme]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return undefined;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => applyTheme("system");

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [theme]);


  const updateTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    updateTheme(newTheme);
  };
  return { theme, updateTheme, toggleTheme };
}
