export type Theme = "light" | "dark" | "system";

export const themes: Theme[] = ["light", "dark", "system"];

export const resolveTheme = (theme: Theme): "light" | "dark" => {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
};

export const setTheme = (theme: Theme) => {
  const resolvedTheme = resolveTheme(theme);
  document.documentElement.setAttribute("data-theme", resolvedTheme);
  document.documentElement.setAttribute("data-theme-preference", theme);
  return resolvedTheme;
};

export const applyTheme = (theme: Theme) => {
  setTheme(theme);
  localStorage.setItem("color-theme", theme);
};

export const getSavedTheme = (): Theme => {
  const saved = localStorage.getItem("color-theme") as Theme | null;
  if (saved && themes.includes(saved)) return saved;

  return "system";
};
