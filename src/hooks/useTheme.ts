import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { ThemePreference } from "../types";

export function useTheme() {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const activeTheme = theme === "system" ? getSystemTheme() : theme;

    applyTheme(activeTheme);
  }, [theme]);

  // Listen to system theme changes in real-time if set to 'system'
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyTheme(getSystemTheme());
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);
}

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: ThemePreference) {
  document.body.classList.remove("theme-system", "theme-light", "theme-dark");
  document.body.classList.add(`theme-${theme}`);
}
